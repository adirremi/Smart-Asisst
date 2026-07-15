// AI classifier: turns a Hebrew WhatsApp message into an event or task (strict JSON).
// Provider-agnostic — set AI_PROVIDER=openai|gemini. Defaults to OpenAI gpt-4.1-mini.

function buildSystemPrompt(todayFull, weekdayHe, timeZone, contactNames) {
  const contactsBlock =
    contactNames && contactNames.length
      ? `\nThe user's saved contacts are: ${contactNames.join(', ')}.\n`
      : `\nThe user has no saved contacts.\n`;

  return `You are an intent + date-extraction engine for a tasks/calendar assistant. The user sends a WhatsApp message in Hebrew.
Today is: ${todayFull} (${weekdayHe}). The user's local timezone is: ${timeZone}. Always interpret and output times in this local timezone.
${contactsBlock}

FIRST detect the user's INTENT, then fill the matching JSON.
Intents:
- "create_event" — schedule something with a time/date (see rules below).
- "create_task" — an actionable to-do without a fixed time.
- "create_multi" — the message contains SEVERAL distinct items (e.g. a task AND an event, or two tasks). Return an "items" array where each element is a full create_event or create_task object (with its own "intent" field). Only use this when there is clearly more than one item; a single item must NOT use create_multi.
  - A DAILY SCHEDULE counts as create_multi: several lines (often separated by new lines) where each line has a time + an activity, e.g. "7:30 בבוקר מתיחות / שמונה וחצי תחילת עבודה / עשר הפסקת צהריים / 12 וחצי אימון / בערב מסעדה". Turn EACH line into its own create_event with its own start_datetime (same date = today unless a date is stated). Keep the original order.
- "view" — the user ASKS what they have. Triggers: "מה יש לי", "מה האירועים", "מה המשימות", "מה יש לי היום/מחר/השבוע", "תראה לי", "מה מתוכנן".
- "cancel" — remove/delete something. Triggers: "בטל", "תבטל", "מחק", "תמחק", "תסיר", "בטלי".
- "update" — move/reschedule/rename an EXISTING **event** (already in the calendar), OR add people to an existing event. Triggers: "תעביר", "תזיז", "העבר", "שנה", "עדכן", "דחה ל" when referring to an **event**. ALSO: adding a person to an already-scheduled event, e.g. "תוסיף את דנה לפגישה מחר". Set "query" to the event's identifying words and optionally "add_attendees". Do NOT use "update" to convert a **task** into an event — use "convert_task_to_event" instead.
- "convert_task_to_event" — turn an EXISTING **open task** into a calendar event at a specific time. Triggers: "תשנה את המשימה", "הפוך את המשימה לאירוע", "תהפוך לאירוע", "שים ביומן", "תעביר ליומן", "תוסיף ליומן", "תשנה ... לאירוע", "תעשה מאירוע את המשימה". MUST include when/when (start_datetime). Set "query" to words that identify the task (without time/date). Use the task's title as the event title unless the user gives a new one ("new_title"). Do NOT use for brand-new items (use create_event) or rescheduling events (use update).
- "complete" — mark a task done. Triggers: "סיימתי", "עשיתי", "ביצעתי", "גמרתי", "בוצע", "עשית".
- "unknown" — greeting, question, small talk, or gibberish that is none of the above.

For "view":
- Set "scope":
  - "events" — the DEFAULT for questions about the schedule/calendar, e.g. "מה יש לי", "מה יש לי מחר", "מה מתוכנן", "מה יש לי ביום שני", "יש לי משהו מחר?".
  - "tasks" — ONLY if the message explicitly mentions tasks/to-dos: "משימות", "מטלות", "מה עליי לעשות", "מה המשימות שלי".
  - "both" — ONLY if the user explicitly asks for everything, e.g. "מה הכל יש לי", "אירועים ומשימות".
- Set "range" to "today" | "tomorrow" | "week" | "date" | "all":
  - Default is "today". "מחר" -> "tomorrow". "השבוע" -> "week".
  - If a specific weekday ("יום שני הבא", "ביום ראשון") or an explicit date is mentioned, use "date" and compute the absolute "date" as "YYYY-MM-DD" relative to Today (next future occurrence for a bare weekday).
  - If scope is "tasks" with no time mentioned, use "all".
For "cancel"/"complete"/"update"/"convert_task_to_event": put in "query" the core subject words that identify the item (WITHOUT time/date words, WITHOUT the trigger verb). For "update", optionally add "new_start_datetime" and/or "new_title". For "convert_task_to_event", "start_datetime" is required.
For "update" with "add_attendees": use the SAME contacts-grounding rule as create_event attendees.

Hebrew spelled-time rules (MUST):
- If a time is written in Hebrew words (e.g., "בחמש", "בשבע", "בעשר", "באחת", "בשמונה וחצי") treat it as a SPECIFIC time.
- Convert Hebrew hour words to a numeric hour: אחת=1, שתיים=2, שלוש=3, ארבע=4, חמש=5, שש=6, שבע=7, שמונה=8, תשע=9, עשר=10, אחת עשרה=11, שתים עשרה=12.
- If "בערב" or "בלילה" is present and the hour is 1–11 -> add 12 (e.g., "חמש בערב" -> 17:00, "שבע בערב" -> 19:00).
- If "בבוקר" is present -> keep AM (e.g., "חמש בבוקר" -> 05:00).
- If "בצהריים" is present and hour is 1–4 -> map to 13:00–16:00 (e.g., "אחת בצהריים" -> 13:00).
- "וחצי" adds 30 minutes, "ורבע" adds 15 minutes: "שמונה וחצי" -> 08:30, "12 וחצי" -> 12:30, "תשע ורבע" -> 09:15.

Weekday interpretation rules:
- If a weekday is mentioned without a date (e.g. "ראשון"): use the next occurrence of that weekday after Today.
- Never jump more than 7 days ahead unless explicitly stated.

NEW RULE (MUST): If the message includes a date (absolute or relative like "מחר/היום/מחרתיים") but no specific time, treat it as an EVENT and use default time 09:00:00.

Creation rules (only when intent is create_event / create_task):
- If a date AND a specific time are mentioned → create_event
- If the message has an action AND a schedule signal (מחר, היום, weekday, בערב, בבוקר, בצהריים, בשעה X, numeric time) → create_event (NOT create_task). Example: "להתקשר לאמא היום בערב" → create_event at 20:00, NOT create_task.
- If it is an action without any schedule/time signal → create_task
- If unsure between event/task AND there is ANY time or date hint → create_event
- If unsure with NO time/date at all → create_task

Attendees / people rule (create_event only) — GROUNDED IN CONTACTS:
- Only treat a name as an attendee if BOTH: (a) there is an explicit "include a person" signal ("תוסיף את", "עם", "ביחד עם", "צרף את", "יחד עם"), AND (b) the name matches ONE of the user's saved contacts listed above.
- If a named person is NOT in the saved contacts list, DO NOT treat them as an attendee — keep the words as part of the title/description. (Better to leave a name in the title than to guess.)
- Put matched names into an "attendees" array, using the contact's name spelling from the list.
- REMOVE matched attendee names AND their connector words ("תוסיף את", "עם", "ביחד עם", "צרף את", "ו-") from the title. Example (if "נוי איטח" and "עוז נווה" are saved contacts): "דאבל דייט בחמישי בערב תוסיף את נוי איטח ואת עוז נווה" -> title "דאבל דייט", attendees ["נוי איטח","עוז נווה"].
- Never invent emails. Omit "attendees" when no contact matches.

Date interpretation rules:
- All dates MUST be calculated relative to "Today is".
- Phrases like "today", "tomorrow", "next Sunday", "this Sunday" MUST be converted to an absolute ISO date based on Today.
- NEVER use past dates. If the calculated date is in the past, move it to the next valid future date.

Numeric time interpretation rules:
- If the number is ALREADY 13–23, it is already a 24-hour time — keep it AS-IS and do NOT add 12.
  A time-of-day word only confirms it. E.g. "14 בצהריים" -> 14:00, "15 בצהריים" -> 15:00, "19 בערב" -> 19:00.
- Otherwise (hour 1–12), apply the time-of-day word:
  - "בבוקר" -> AM (e.g., "7 בבוקר" -> 07:00)
  - "בצהריים" -> 12:00–14:00 (e.g., "1 בצהריים" -> 13:00)
  - "אחר הצהריים" -> 15:00–18:00
  - "בערב" -> add 12 if hour < 12 (e.g. "7 בערב" -> 19:00)
  - "בלילה" -> PM (e.g. "10 בלילה" -> 22:00)
- NEVER ignore the time-of-day word if it exists.

Time-of-day without a numeric time (treat as EVENT, default time):
- בבוקר -> 08:00:00
- בצהריים -> 13:00:00
- אחר הצהריים -> 16:00:00
- בערב -> 20:00:00
- בלילה -> 22:00:00
- Only use 00:00:00 if the user explicitly says "all day" / "כל היום".

CRITICAL TITLE RULE (STRICT):
- Create the title by copying the user's message and then REMOVING time/date expressions.
- Remove tokens like: "היום","מחר","מחרתיים","אתמול","ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת","ביום","ביום ה","בשעה","ב-","בבוקר","בצהריים","אחר הצהריים","בערב","בלילה","לפנות בוקר","לקראת ערב","בבוקר מוקדם".
- Also remove numeric times like "7","07:00","19:30","7:00" and spelled times like "שבע","שמונה","תשע","עשר","אחת","שתיים","שלוש","ארבע","חמש","שש","שבע וחצי".
- TRIM extra spaces and leftover punctuation at the ends ("-", ",", ":", "–").
- FINAL CHECK: title MUST NOT contain any of: "מחר","היום","שבת","ראשון","שני","שלישי","רביעי","חמישי","שישי","בבוקר","בצהריים","בערב","בלילה". Remove them if present.
- Do NOT rephrase or summarize beyond removing time/date expressions.

Hebrew cleanup: keep original meaning, fix obvious typos.

CONFIDENCE (MUST): add a "confidence" number between 0 and 1 to every response, reflecting how sure you are about BOTH the intent and the extracted fields (dates, titles, the target of cancel/update). Be honest: use a low value (< 0.5) when the message is vague, when a cancel/update target is unclear, or when you had to guess a time/date. Use a high value (> 0.8) only when the message is explicit.
CLARIFY (optional): when confidence is low, also add a short Hebrew "clarify" question that would resolve the ambiguity (e.g. "לאיזה אירוע להוסיף את דנה?"). Omit it when confidence is high.

Return ONLY valid JSON. No explanations. Add "confidence" (and optional "clarify") to whichever shape you use:
{ "intent": "create_event", "title": "", "start_datetime": "YYYY-MM-DD HH:MM:SS", "duration_minutes": 30, "attendees": ["שם מלא"], "confidence": 0.0 }
{ "intent": "create_task", "title": "", "confidence": 0.0 }
{ "intent": "create_multi", "items": [ { "intent": "create_task", "title": "" }, { "intent": "create_event", "title": "", "start_datetime": "YYYY-MM-DD HH:MM:SS", "duration_minutes": 30, "attendees": ["שם מלא"] } ], "confidence": 0.0 }
{ "intent": "view", "scope": "events|tasks|both", "range": "today|tomorrow|week|date|all", "date": "YYYY-MM-DD", "confidence": 0.0 }
{ "intent": "cancel", "target_type": "event|task", "query": "", "confidence": 0.0, "clarify": "" }
{ "intent": "update", "target_type": "event", "query": "", "new_start_datetime": "YYYY-MM-DD HH:MM:SS", "new_title": "", "add_attendees": ["שם מלא"], "confidence": 0.0, "clarify": "" }
{ "intent": "convert_task_to_event", "query": "", "start_datetime": "YYYY-MM-DD HH:MM:SS", "duration_minutes": 30, "new_title": "", "confidence": 0.0, "clarify": "" }
{ "intent": "complete", "query": "", "confidence": 0.0 }
{ "intent": "unknown", "confidence": 0.0 }`;
}

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function classifyOpenAI(systemPrompt, message) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4.1-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return extractJson(data.choices?.[0]?.message?.content);
}

async function classifyGemini(systemPrompt, message) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return extractJson(text);
}

export async function interpretMessage({ message, timeZone, todayFull, weekdayHe, contactNames }) {
  const systemPrompt = buildSystemPrompt(todayFull, weekdayHe, timeZone, contactNames);
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

  const result =
    provider === 'gemini'
      ? await classifyGemini(systemPrompt, message)
      : await classifyOpenAI(systemPrompt, message);

  if (!result || !result.intent) {
    // Couldn't parse a valid response — treat as unrecognized.
    return { intent: 'unknown' };
  }
  return result;
}

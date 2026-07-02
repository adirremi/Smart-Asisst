// AI classifier: turns a Hebrew WhatsApp message into an event or task (strict JSON).
// Provider-agnostic — set AI_PROVIDER=openai|gemini. Defaults to OpenAI gpt-4.1-mini.

function buildSystemPrompt(todayFull, weekdayHe, timeZone) {
  return `You are a classification and date-extraction engine. The user sends a WhatsApp message in Hebrew.
Today is: ${todayFull} (${weekdayHe}). The user's local timezone is: ${timeZone}. Always interpret and output times in this local timezone.

Hebrew spelled-time rules (MUST):
- If a time is written in Hebrew words (e.g., "בחמש", "בשבע", "בעשר", "באחת", "בשמונה וחצי") treat it as a SPECIFIC time.
- Convert Hebrew hour words to a numeric hour: אחת=1, שתיים=2, שלוש=3, ארבע=4, חמש=5, שש=6, שבע=7, שמונה=8, תשע=9, עשר=10, אחת עשרה=11, שתים עשרה=12.
- If "בערב" or "בלילה" is present and the hour is 1–11 -> add 12 (e.g., "חמש בערב" -> 17:00, "שבע בערב" -> 19:00).
- If "בבוקר" is present -> keep AM (e.g., "חמש בבוקר" -> 05:00).
- If "בצהריים" is present and hour is 1–4 -> map to 13:00–16:00 (e.g., "אחת בצהריים" -> 13:00).

Weekday interpretation rules:
- If a weekday is mentioned without a date (e.g. "ראשון"): use the next occurrence of that weekday after Today.
- Never jump more than 7 days ahead unless explicitly stated.

NEW RULE (MUST): If the message includes a date (absolute or relative like "מחר/היום/מחרתיים") but no specific time, treat it as an EVENT and use default time 09:00:00.

Your task: Decide whether the message describes:
1) a calendar event
2) a task
Rules:
- If a date AND a specific time are mentioned → event
- If it is an action without a fixed time → task
- If unsure → task

Date interpretation rules:
- All dates MUST be calculated relative to "Today is".
- Phrases like "today", "tomorrow", "next Sunday", "this Sunday" MUST be converted to an absolute ISO date based on Today.
- NEVER use past dates. If the calculated date is in the past, move it to the next valid future date.

Numeric time interpretation rules:
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

Return ONLY valid JSON. No explanations.
Event format: { "type": "event", "title": "", "start_datetime": "YYYY-MM-DD HH:MM:SS", "duration_minutes": 30 }
Task format: { "type": "task", "title": "" }`;
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

export async function classifyMessage({ message, timeZone, todayFull, weekdayHe }) {
  const systemPrompt = buildSystemPrompt(todayFull, weekdayHe, timeZone);
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

  const result =
    provider === 'gemini'
      ? await classifyGemini(systemPrompt, message)
      : await classifyOpenAI(systemPrompt, message);

  if (!result || !result.type) {
    // Fallback: treat as a plain task using the raw message.
    return { type: 'task', title: message.trim().slice(0, 200) };
  }
  return result;
}

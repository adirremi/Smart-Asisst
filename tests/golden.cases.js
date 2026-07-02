// Golden regression cases for the WhatsApp NLU (api/_lib/ai.js).
// Each case runs the real model against a FIXED reference date, then checks only
// the fields listed in `expect`. Add every real-world miss here before tweaking
// the prompt, so fixes don't cause regressions.
//
// Supported `expect` matchers:
//   intent, scope, range, target_type   -> exact string match
//   timeEndsWith: "HH:MM:SS"             -> start_datetime ends with this time
//   dateStartsWith: "YYYY-MM-DD"         -> start_datetime starts with this date
//   hasAttendees: true|false             -> attendees / add_attendees non-empty
//   attendeesInclude: ["name", ...]      -> all present in attendees/add_attendees
//   attendeesExclude: ["name", ...]      -> none present (grounding check)
//   titleExcludes: ["token", ...]        -> title must not contain these
//   itemsAtLeast: N                      -> create_multi items length >= N
//   minConfidence / maxConfidence: 0..1  -> confidence bound

// Fixed context so relative dates are deterministic. 2026-07-05 is a Sunday.
export const CONTEXT = {
  timeZone: 'Asia/Jerusalem',
  todayFull: '2026-07-05',
  weekdayHe: 'יום ראשון',
  contactNames: ['נוי איטח', 'עוז נווה', 'דנה'],
};

export const CASES = [
  {
    name: 'event with explicit evening time',
    message: 'מחר בחמש בערב להתקשר ליותם',
    expect: { intent: 'create_event', timeEndsWith: '17:00:00', titleExcludes: ['מחר', 'בערב', 'חמש'] },
  },
  {
    name: 'numeric 24h afternoon stays as-is',
    message: 'מחר ב14 בצהריים פגישה',
    expect: { intent: 'create_event', timeEndsWith: '14:00:00' },
  },
  {
    name: 'plain task',
    message: 'לשלם את חשבון החשמל',
    expect: { intent: 'create_task' },
  },
  {
    name: 'view tomorrow defaults to events',
    message: 'מה יש לי מחר?',
    expect: { intent: 'view', scope: 'events', range: 'tomorrow' },
  },
  {
    name: 'view tasks explicitly',
    message: 'מה המשימות שלי?',
    expect: { intent: 'view', scope: 'tasks' },
  },
  {
    name: 'cancel an event',
    message: 'בטל את הפגישה עם דנה',
    expect: { intent: 'cancel' },
  },
  {
    name: 'complete a task',
    message: 'סיימתי לשלם חשבונות',
    expect: { intent: 'complete' },
  },
  {
    name: 'event with known contacts as attendees',
    message: 'דאבל דייט בחמישי בערב תוסיף את נוי איטח ואת עוז נווה',
    expect: {
      intent: 'create_event',
      hasAttendees: true,
      attendeesInclude: ['נוי איטח', 'עוז נווה'],
      titleExcludes: ['נוי איטח', 'עוז נווה', 'תוסיף'],
    },
  },
  {
    name: 'grounding: unknown name is NOT an attendee',
    message: 'פגישה מחר בעשר עם ספק המים',
    expect: { intent: 'create_event', attendeesExclude: ['ספק המים'] },
  },
  {
    name: 'add attendee to existing event',
    message: 'תוסיף את דנה לפגישה מחר',
    expect: { intent: 'update', attendeesInclude: ['דנה'] },
  },
  {
    name: 'reschedule an event',
    message: 'תעביר את הפגישה עם דנה למחר בשמונה בערב',
    expect: { intent: 'update' },
  },
  {
    name: 'multiple items in one message',
    message: 'לקנות חלב ולהתקשר לאמא מחר בחמש',
    expect: { intent: 'create_multi', itemsAtLeast: 2 },
  },
  {
    name: 'time-of-day word without number -> default evening',
    message: 'מחר בערב אסיפת הורים',
    expect: { intent: 'create_event', timeEndsWith: '20:00:00' },
  },
];

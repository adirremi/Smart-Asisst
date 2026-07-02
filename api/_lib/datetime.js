// Timezone helpers using the built-in Intl API (no external deps).

const HEB_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second
  );
  return asUTC - date.getTime();
}

// Convert a wall-clock local time in `timeZone` to a UTC Date instant.
export function zonedTimeToUtc(localStr, timeZone) {
  const [datePart, timePartRaw] = String(localStr).split(/[ T]/);
  const timePart = timePartRaw || '00:00:00';
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi, s = 0] = timePart.split(':').map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, s);
  const offset = getOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

// Current date/time as the user perceives it locally: { iso, weekdayHe, dateStr }.
export function nowInTimeZone(timeZone) {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  const timeStr = `${parts.hour}:${parts.minute}:${parts.second}`;
  const weekdayIdx = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return {
    dateStr,
    timeStr,
    full: `${dateStr} ${timeStr}`,
    weekdayHe: HEB_WEEKDAYS[weekdayIdx],
  };
}

// Minutes since local midnight in the given timezone (0..1439).
export function localMinutesOfDay(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
    .formatToParts(new Date())
    .reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0; // some environments render midnight as 24
  return hour * 60 + parseInt(parts.minute, 10);
}

// Compute a UTC [start, end] window for a "view" range in the user's local day(s).
export function viewRange(range, dateStr, timeZone) {
  const todayStr = nowInTimeZone(timeZone).dateStr;
  const addDays = (str, n) => {
    const d = new Date(`${str}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  let startDay = todayStr;
  let endDay = todayStr;

  if (range === 'tomorrow') {
    startDay = addDays(todayStr, 1);
    endDay = startDay;
  } else if (range === 'week') {
    startDay = todayStr;
    endDay = addDays(todayStr, 7);
  } else if (range === 'date' && dateStr) {
    startDay = dateStr;
    endDay = dateStr;
  } else if (range === 'all') {
    startDay = todayStr;
    endDay = addDays(todayStr, 365);
  }

  return {
    startUtc: zonedTimeToUtc(`${startDay} 00:00:00`, timeZone),
    endUtc: zonedTimeToUtc(`${endDay} 23:59:59`, timeZone),
  };
}

// Human-friendly Hebrew date + time for confirmation messages.
export function formatForUser(isoUtc, timeZone) {
  const date = new Date(isoUtc);
  const dateStr = new Intl.DateTimeFormat('he-IL', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const timeStr = new Intl.DateTimeFormat('he-IL', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return { dateStr, timeStr };
}

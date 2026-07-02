// Countries, US states, and IANA timezones for onboarding.

export const COUNTRIES = [
  { code: 'IL', label: 'ישראל', timezone: 'Asia/Jerusalem' },
  { code: 'US', label: 'ארצות הברית', timezone: null },
];

export const US_STATES = [
  { code: 'CA', label: 'קליפורניה', timezone: 'America/Los_Angeles' },
  { code: 'NY', label: 'ניו יורק', timezone: 'America/New_York' },
  { code: 'TX', label: 'טקסס', timezone: 'America/Chicago' },
  { code: 'FL', label: 'פלורידה', timezone: 'America/New_York' },
  { code: 'IL', label: 'אילינוי', timezone: 'America/Chicago' },
  { code: 'PA', label: 'פנסילבניה', timezone: 'America/New_York' },
  { code: 'OH', label: 'אוהיו', timezone: 'America/New_York' },
  { code: 'GA', label: "ג'ורג'יה", timezone: 'America/New_York' },
  { code: 'NC', label: 'קרוליינה הצפונית', timezone: 'America/New_York' },
  { code: 'MI', label: 'מישיגן', timezone: 'America/Detroit' },
  { code: 'AZ', label: 'אריזונה', timezone: 'America/Phoenix' },
  { code: 'CO', label: 'קולורדו', timezone: 'America/Denver' },
];

export function resolveTimezone(countryCode, stateCode) {
  if (countryCode === 'IL') return 'Asia/Jerusalem';
  const state = US_STATES.find((s) => s.code === stateCode);
  return state?.timezone || 'America/New_York';
}

export function formatTimezoneLabel(tz) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('he-IL', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${tz} (${formatter.format(now)})`;
  } catch {
    return tz;
  }
}

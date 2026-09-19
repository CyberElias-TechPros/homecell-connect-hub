/**
 * Time zone helpers.
 *
 * All instants are stored and transmitted in UTC. This module converts
 * between a wall-clock time in a named IANA zone (e.g. "Africa/Lagos") and
 * the corresponding UTC instant, which is what the landing page needs in
 * order to show an accurate countdown to the next meeting.
 *
 * Implemented with Intl rather than a date library: the runtime already has a
 * complete IANA database, and this avoids shipping one.
 */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Offset of `timeZone` from UTC, in milliseconds, at the given instant. */
export function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  // Format the instant as if it were UTC, then read back the wall-clock
  // values the zone actually shows. The difference is the offset.
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

  const parts = dtf.formatToParts(date);
  const lookup: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') lookup[part.type] = Number(part.value);
  }

  // Intl renders midnight as hour 24 in some locales/engines; normalise it.
  const hour = lookup.hour === 24 ? 0 : lookup.hour;

  const asUtc = Date.UTC(
    lookup.year,
    lookup.month - 1,
    lookup.day,
    hour,
    lookup.minute,
    lookup.second,
  );

  return asUtc - date.getTime();
}

/**
 * Convert a wall-clock date/time in `timeZone` into the real UTC instant.
 * Applies the offset twice so that instants near a DST boundary resolve
 * correctly for zones that observe daylight saving.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstGuess = new Date(naiveUtc - getTimeZoneOffsetMs(timeZone, new Date(naiveUtc)));
  const secondGuess = new Date(naiveUtc - getTimeZoneOffsetMs(timeZone, firstGuess));
  return secondGuess;
}

/** What time is it now, expressed as wall-clock parts in `timeZone`? */
export function nowInTimeZone(timeZone: string, now: Date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const lookup: Record<string, string> = {};
  for (const part of dtf.formatToParts(now)) {
    if (part.type !== 'literal') lookup[part.type] = part.value;
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: lookup.hour === '24' ? 0 : Number(lookup.hour),
    minute: Number(lookup.minute),
    weekday: (lookup.weekday ?? '').toLowerCase(),
  };
}

/**
 * The next occurrence of a weekly meeting.
 *
 * `meetingDay` is a weekday name ("sunday"), `meetingTime` is "HH:MM" in
 * 24-hour form, interpreted in `timeZone`. Returns null when either is
 * missing or unparseable, so callers must handle "no schedule configured"
 * rather than silently showing a wrong time.
 */
export function nextWeeklyMeeting(
  meetingDay: string | null | undefined,
  meetingTime: string | null | undefined,
  timeZone: string,
  now: Date = new Date(),
): Date | null {
  if (!meetingDay || !meetingTime) return null;

  const targetDow = WEEKDAYS.indexOf(meetingDay.trim().toLowerCase());
  if (targetDow === -1) return null;

  const match = /^(\d{1,2}):(\d{2})/.exec(meetingTime.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  let zone: string;
  try {
    // Throws on an invalid IANA name.
    new Intl.DateTimeFormat('en-US', { timeZone }).format(now);
    zone = timeZone;
  } catch {
    zone = 'UTC';
  }

  const local = nowInTimeZone(zone, now);
  const currentDow = WEEKDAYS.indexOf(local.weekday);
  if (currentDow === -1) return null;

  // Days ahead until the target weekday (0 = today).
  let daysAhead = (targetDow - currentDow + 7) % 7;

  const candidate = zonedWallTimeToUtc(
    local.year,
    local.month,
    local.day + daysAhead,
    hour,
    minute,
    zone,
  );

  // If that has already passed, roll forward a week.
  if (candidate.getTime() <= now.getTime()) {
    daysAhead += 7;
    return zonedWallTimeToUtc(local.year, local.month, local.day + daysAhead, hour, minute, zone);
  }

  return candidate;
}

/** "Sunday, 21 September at 6:00 PM" rendered in the given zone. */
export function formatMeetingTime(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  started: boolean;
}

export function countdownTo(target: Date | null, now: Date = new Date()): Countdown {
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, started: false };
  }
  let ms = target.getTime() - now.getTime();
  const started = ms <= 0;
  if (ms < 0) ms = 0;

  const seconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    totalMs: ms,
    started,
  };
}

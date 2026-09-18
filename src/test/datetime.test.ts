import { describe, it, expect } from 'vitest';
import {
  getTimeZoneOffsetMs,
  zonedWallTimeToUtc,
  nextWeeklyMeeting,
  countdownTo,
  formatMeetingTime,
} from '../lib/datetime';

describe('getTimeZoneOffsetMs', () => {
  it('returns +1h for Lagos (no DST)', () => {
    const jan = getTimeZoneOffsetMs('Africa/Lagos', new Date('2026-01-15T12:00:00Z'));
    const jul = getTimeZoneOffsetMs('Africa/Lagos', new Date('2026-07-15T12:00:00Z'));
    expect(jan).toBe(60 * 60 * 1000);
    expect(jul).toBe(60 * 60 * 1000);
  });

  it('tracks DST for London', () => {
    const winter = getTimeZoneOffsetMs('Europe/London', new Date('2026-01-15T12:00:00Z'));
    const summer = getTimeZoneOffsetMs('Europe/London', new Date('2026-07-15T12:00:00Z'));
    expect(winter).toBe(0);
    expect(summer).toBe(60 * 60 * 1000);
  });

  it('handles a negative offset (New York)', () => {
    const jan = getTimeZoneOffsetMs('America/New_York', new Date('2026-01-15T12:00:00Z'));
    expect(jan).toBe(-5 * 60 * 60 * 1000);
  });
});

describe('zonedWallTimeToUtc', () => {
  it('converts 18:00 Lagos to 17:00 UTC', () => {
    const utc = zonedWallTimeToUtc(2026, 9, 20, 18, 0, 'Africa/Lagos');
    expect(utc.toISOString()).toBe('2026-09-20T17:00:00.000Z');
  });

  it('converts 18:00 London in summer to 17:00 UTC', () => {
    const utc = zonedWallTimeToUtc(2026, 7, 20, 18, 0, 'Europe/London');
    expect(utc.toISOString()).toBe('2026-07-20T17:00:00.000Z');
  });

  it('converts 18:00 London in winter to 18:00 UTC', () => {
    const utc = zonedWallTimeToUtc(2026, 1, 20, 18, 0, 'Europe/London');
    expect(utc.toISOString()).toBe('2026-01-20T18:00:00.000Z');
  });
});

describe('nextWeeklyMeeting', () => {
  it('finds Sunday 18:00 Lagos from a Wednesday', () => {
    // Wednesday 16 Sept 2026
    const now = new Date('2026-09-16T10:00:00Z');
    const next = nextWeeklyMeeting('sunday', '18:00', 'Africa/Lagos', now);
    expect(next).not.toBeNull();
    expect(next!.toISOString()).toBe('2026-09-20T17:00:00.000Z');
  });

  it('rolls to next week when today is the meeting day but already past', () => {
    // Sunday 20 Sept 2026, 20:00 UTC — after the 17:00 UTC meeting
    const now = new Date('2026-09-20T20:00:00Z');
    const next = nextWeeklyMeeting('sunday', '18:00', 'Africa/Lagos', now);
    expect(next!.toISOString()).toBe('2026-09-27T17:00:00.000Z');
  });

  it('returns today when the meeting has not started yet', () => {
    // Sunday 20 Sept 2026, 09:00 UTC — before the 17:00 UTC meeting
    const now = new Date('2026-09-20T09:00:00Z');
    const next = nextWeeklyMeeting('sunday', '18:00', 'Africa/Lagos', now);
    expect(next!.toISOString()).toBe('2026-09-20T17:00:00.000Z');
  });

  it('returns null rather than guessing when no schedule is configured', () => {
    expect(nextWeeklyMeeting(null, '18:00', 'Africa/Lagos')).toBeNull();
    expect(nextWeeklyMeeting('sunday', null, 'Africa/Lagos')).toBeNull();
    expect(nextWeeklyMeeting('notaday', '18:00', 'Africa/Lagos')).toBeNull();
    expect(nextWeeklyMeeting('sunday', '25:99', 'Africa/Lagos')).toBeNull();
  });

  it('falls back to UTC for an invalid time zone name instead of throwing', () => {
    const now = new Date('2026-09-16T10:00:00Z');
    const next = nextWeeklyMeeting('sunday', '18:00', 'Not/AZone', now);
    expect(next!.toISOString()).toBe('2026-09-20T18:00:00.000Z');
  });
});

describe('countdownTo', () => {
  it('splits a duration into parts', () => {
    const now = new Date('2026-09-18T00:00:00Z');
    const target = new Date('2026-09-20T01:02:03Z');
    const c = countdownTo(target, now);
    expect(c.days).toBe(2);
    expect(c.hours).toBe(1);
    expect(c.minutes).toBe(2);
    expect(c.seconds).toBe(3);
    expect(c.started).toBe(false);
  });

  it('clamps at zero once the meeting has started', () => {
    const now = new Date('2026-09-20T02:00:00Z');
    const target = new Date('2026-09-20T01:00:00Z');
    const c = countdownTo(target, now);
    expect(c.started).toBe(true);
    expect(c.totalMs).toBe(0);
    expect(c.days).toBe(0);
  });

  it('is safe with no schedule', () => {
    expect(countdownTo(null).started).toBe(false);
    expect(countdownTo(null).totalMs).toBe(0);
  });
});

describe('formatMeetingTime', () => {
  it('renders in the cell time zone, not the viewer locale', () => {
    const t = new Date('2026-09-20T17:00:00Z');
    expect(formatMeetingTime(t, 'Africa/Lagos')).toContain('6:00 pm');
  });
});

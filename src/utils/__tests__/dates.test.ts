// src/utils/__tests__/dates.test.ts
// Pure-function tests for src/utils/dates.ts. The canonical date helpers
// that every screen should be importing (see review finding 4.2).

import {
  getStartOfWeek,
  getWeekDays,
  isSameDay,
  formatArabicDayName,
  formatArabicDate,
  getEndOfWeek,
  formatTime,
  getEndTime,
} from '../dates';

describe('getStartOfWeek', () => {
  test('returns Sunday 00:00 for a mid-week date when week starts on Sunday', () => {
    // 2025-01-08 is a Wednesday in proleptic Gregorian.
    const wed = new Date(2025, 0, 8, 14, 30, 0);
    const start = getStartOfWeek(wed, 0);
    expect(start.getDay()).toBe(0); // Sunday
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
  });

  test('returns same date (zeroed) when given a Sunday with Sunday-start', () => {
    // 2025-01-05 is a Sunday.
    const sun = new Date(2025, 0, 5, 12, 0, 0);
    const start = getStartOfWeek(sun, 0);
    expect(start.getDay()).toBe(0);
    expect(start.getDate()).toBe(5);
    expect(start.getHours()).toBe(0);
  });

  test('does not mutate input date', () => {
    const d = new Date(2025, 0, 8, 14, 30, 0);
    const snapshot = d.getTime();
    getStartOfWeek(d, 0);
    expect(d.getTime()).toBe(snapshot);
  });
});

describe('getWeekDays', () => {
  test('returns seven consecutive dates', () => {
    const sun = new Date(2025, 0, 5, 0, 0, 0);
    const days = getWeekDays(sun);
    expect(days).toHaveLength(7);
    days.forEach((d, i) => {
      expect(d.getDate()).toBe(5 + i);
    });
  });
});

describe('getEndOfWeek', () => {
  test('returns Saturday 23:59:59.999 for a Sunday start', () => {
    const sun = new Date(2025, 0, 5, 0, 0, 0);
    const end = getEndOfWeek(sun);
    expect(end.getDay()).toBe(6); // Saturday
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });
});

describe('isSameDay', () => {
  test('true for two times on the same calendar day', () => {
    const a = new Date(2025, 0, 5, 1, 0, 0);
    const b = new Date(2025, 0, 5, 23, 30, 0);
    expect(isSameDay(a, b)).toBe(true);
  });

  test('false across midnight', () => {
    const a = new Date(2025, 0, 5, 23, 59, 59);
    const b = new Date(2025, 0, 6, 0, 0, 1);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('formatArabicDayName', () => {
  test('returns the right Arabic name for each weekday index', () => {
    // 2025-01-05 is Sunday.
    const sun = new Date(2025, 0, 5);
    expect(formatArabicDayName(sun)).toBe('الأحد');
    const mon = new Date(2025, 0, 6);
    expect(formatArabicDayName(mon)).toBe('الإثنين');
    const sat = new Date(2025, 0, 11);
    expect(formatArabicDayName(sat)).toBe('السبت');
  });
});

describe('formatArabicDate', () => {
  test('formats day with Arabic month name', () => {
    expect(formatArabicDate(new Date(2025, 0, 18))).toBe('18 يناير');
    expect(formatArabicDate(new Date(2025, 11, 3))).toBe('3 ديسمبر');
  });
});

describe('formatTime', () => {
  test('formats local time as HH:MM with zero-padding', () => {
    const d = new Date(2025, 0, 1, 9, 5, 0);
    expect(formatTime(d.toISOString())).toBe('09:05');
  });
});

describe('getEndTime', () => {
  test('adds duration in minutes to start ISO and returns HH:MM', () => {
    const startISO = new Date(2025, 0, 1, 9, 0, 0).toISOString();
    expect(getEndTime(startISO, 60)).toBe('10:00');
  });

  test('handles non-trivial minute math', () => {
    const startISO = new Date(2025, 0, 1, 9, 45, 0).toISOString();
    expect(getEndTime(startISO, 30)).toBe('10:15');
  });

  test('handles crossing midnight (returns next-day time)', () => {
    // 23:30 + 60min = 00:30 next day, but the function reports HH:MM only.
    const startISO = new Date(2025, 0, 1, 23, 30, 0).toISOString();
    expect(getEndTime(startISO, 60)).toBe('00:30');
  });
});

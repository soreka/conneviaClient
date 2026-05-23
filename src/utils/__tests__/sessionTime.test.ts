// src/utils/__tests__/sessionTime.test.ts
// Verifies the past-session helpers in Asia/Jerusalem timezone.

import {
  isSessionInPast,
  getPastSessionLabel,
  getAdminPastSessionLabel,
  getPastSessionAlertMessage,
} from '../sessionTime';

describe('isSessionInPast', () => {
  test('a session one hour in the past is detected as past', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(isSessionInPast(oneHourAgo.toISOString())).toBe(true);
  });

  test('a session one hour in the future is NOT past', () => {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    expect(isSessionInPast(oneHourFromNow.toISOString())).toBe(false);
  });

  test('accepts a Date object directly', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(isSessionInPast(oneHourAgo)).toBe(true);
  });

  test('a far-future session is NOT past', () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    expect(isSessionInPast(future.toISOString())).toBe(false);
  });
});

describe('Arabic label helpers', () => {
  test('getPastSessionLabel', () => {
    expect(getPastSessionLabel()).toBe('انتهت الحصة');
  });

  test('getAdminPastSessionLabel', () => {
    expect(getAdminPastSessionLabel()).toBe('جلسة منتهية - عرض فقط');
  });

  test('getPastSessionAlertMessage', () => {
    expect(getPastSessionAlertMessage()).toBe('لا يمكن الحجز في حصة انتهت');
  });
});

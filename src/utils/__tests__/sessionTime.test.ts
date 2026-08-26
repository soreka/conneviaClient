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

// SESSTIME-HERMES-01 — source-shape guard.
// Behavioral tests CANNOT catch this class of bug: Jest runs on Node, whose
// Date constructor parses locale strings like "8/26/2026, 5:35:38 PM", but
// Hermes (the engine on real devices) returns Invalid Date for them — so the
// old toLocaleString-round-trip implementation passed every test here while
// isSessionInPast returned false for EVERYTHING on device (past sessions
// rendered reservable; Ahmed hit this on iOS 2026-08-26). Pin that the module
// never routes the comparison through locale-string parsing again: instants
// are absolute, epoch math needs no timezone.
describe('SESSTIME-HERMES-01 — device-engine parity (source-shape)', () => {
  test('sessionTime.ts must not use toLocaleString / new Date(<non-ISO string>) round-trips', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'sessionTime.ts'),
      'utf8'
    );
    // Strip comments so the explanation of the old bug doesn't trip the guard.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/toLocaleString/);
    expect(code).not.toMatch(/timeZone/);
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

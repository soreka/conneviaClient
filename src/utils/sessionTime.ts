/**
 * Session time utilities for past session detection.
 *
 * HERMES CONSTRAINT (SESSTIME-HERMES-01): the comparison must be pure epoch
 * math. The previous implementation round-tripped through
 * `toLocaleString('en-US', { timeZone })` + `new Date(<locale string>)` —
 * Node (Jest) parses that string, but Hermes on real devices returns
 * Invalid Date, so every comparison was false and past sessions rendered as
 * reservable ON DEVICE while all tests stayed green. Comparing instants
 * needs no timezone at all: an ISO timestamp is absolute.
 */

/**
 * Check if a session start time is in the past (the session already started).
 *
 * @param startsAtISO - ISO date string or Date object of session start time
 * @returns true if the session has already started
 */
export function isSessionInPast(startsAtISO: string | Date): boolean {
  const sessionMs =
    typeof startsAtISO === 'string'
      ? Date.parse(startsAtISO) // ISO 8601 — parses identically in Hermes and Node
      : startsAtISO.getTime();

  // Unparseable input → treat as NOT past. Failing open keeps a weird-but-
  // bookable session bookable (the server past-guard is the backstop);
  // failing closed would dead-lock a valid card behind a formatting quirk.
  if (Number.isNaN(sessionMs)) return false;

  return sessionMs <= Date.now();
}

/**
 * Get Arabic label for past session badge
 */
export function getPastSessionLabel(): string {
  return 'انتهت الحصة';
}

/**
 * Get Arabic label for admin view-only mode
 */
export function getAdminPastSessionLabel(): string {
  return 'جلسة منتهية - عرض فقط';
}

/**
 * Get Arabic alert message when user tries to book a past session
 */
export function getPastSessionAlertMessage(): string {
  return 'لا يمكن الحجز في حصة انتهت';
}

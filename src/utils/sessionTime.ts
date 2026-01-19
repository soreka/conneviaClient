/**
 * Session time utilities for past session detection
 * Uses Asia/Jerusalem timezone for accurate local time comparison
 */

const TIMEZONE = 'Asia/Jerusalem';

/**
 * Get current time in Asia/Jerusalem timezone as a Date object
 */
function getNowInJerusalem(): Date {
  // Get current time string in Jerusalem timezone
  const nowStr = new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(nowStr);
}

/**
 * Convert an ISO date string to Jerusalem local time Date object
 */
function toJerusalemTime(isoString: string | Date): Date {
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  const localStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(localStr);
}

/**
 * Check if a session start time is in the past relative to Asia/Jerusalem timezone
 * 
 * @param startsAtISO - ISO date string or Date object of session start time
 * @returns true if the session has already started
 */
export function isSessionInPast(startsAtISO: string | Date): boolean {
  const sessionTime = toJerusalemTime(startsAtISO);
  const now = getNowInJerusalem();
  
  const isPast = sessionTime.getTime() <= now.getTime();
  
  // Dev logging
  if (__DEV__ && isPast) {
    console.log('[sessionTime] Past session detected:', {
      sessionTime: sessionTime.toISOString(),
      now: now.toISOString(),
    });
  }
  
  return isPast;
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

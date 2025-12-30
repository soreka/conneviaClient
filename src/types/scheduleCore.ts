// src/types/scheduleCore.ts
// Shared session contract for Consumer and Admin sides

/**
 * Normalized weekday identifiers (Sunday-first)
 */
export type WeekdayId =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

/**
 * Session type keys - stable identifiers (not Arabic text)
 */
export type SessionType =
  | 'pilates_reformer'
  | 'pilates_mat'
  | 'strength'
  | 'yoga'
  | 'other';

/**
 * Mapping from SessionType to Arabic display names
 */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  pilates_reformer: 'بيلاتس أجهزة',
  pilates_mat: 'بيلاتس مات',
  strength: 'تمارين القوة',
  yoga: 'يوغا صباحية',
  other: 'أخرى',
};

/**
 * Mapping from Arabic text to SessionType (for reverse lookup)
 */
export const SESSION_TYPE_FROM_ARABIC: Record<string, SessionType> = {
  'بيلاتس أجهزة': 'pilates_reformer',
  'بيلاتس مات': 'pilates_mat',
  'تمارين القوة': 'strength',
  'يوغا صباحية': 'yoga',
  'يوغا': 'yoga',
  'بيلاتس': 'pilates_reformer',
  'تمارين': 'strength',
};

/**
 * Weekday labels in Arabic (Sunday-first order)
 */
export const WEEKDAY_LABELS: Record<WeekdayId, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

/**
 * Weekday order array (Sunday-first)
 */
export const WEEKDAY_ORDER: WeekdayId[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Core session interface - shared between Consumer and Admin
 * 
 * This is the normalized, client-side representation of a session.
 * All API responses should be mapped to this structure.
 */
export interface SessionCore {
  /** Unique session identifier */
  id: string;
  
  /** Normalized weekday id (sunday, monday, etc.) */
  weekday: WeekdayId;
  
  /** Optional exact date in ISO format (YYYY-MM-DD or full ISO string) */
  dateISO?: string;
  
  /** Start time in 24h format "HH:mm" */
  startTime: string;
  
  /** End time in 24h format "HH:mm" */
  endTime: string;
  
  /** Session type key (stable identifier) */
  type: SessionType;
  
  /** Arabic title shown in UI (e.g., "بيلاتس أجهزة") */
  titleAr: string;
  
  /** Optional instructor name */
  instructorName?: string;
  
  /** Optional location name */
  locationName?: string;
  
  /** Total capacity (beds/spaces) */
  capacityTotal: number;
  
  /** Number of occupied spaces (bookings count) */
  occupiedCount: number;
  
  /** Session status from backend */
  status?: string;
}

/**
 * Computed availability helpers
 */
export const getAvailableSeats = (session: SessionCore): number => {
  return Math.max(0, session.capacityTotal - session.occupiedCount);
};

export const isFull = (session: SessionCore): boolean => {
  return session.occupiedCount >= session.capacityTotal;
};

/**
 * Get Arabic availability badge text
 */
export const getAvailabilityBadge = (session: SessionCore): { text: string; isFull: boolean } => {
  const full = isFull(session);
  return {
    text: full ? 'ممتلئ' : 'متاح',
    isFull: full,
  };
};

/**
 * Get occupancy percentage (0-100)
 */
export const getOccupancyPercent = (session: SessionCore): number => {
  if (session.capacityTotal <= 0) return 0;
  return Math.min(100, (session.occupiedCount / session.capacityTotal) * 100);
};

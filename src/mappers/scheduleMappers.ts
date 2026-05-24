// src/mappers/scheduleMappers.ts
// Mapping functions to convert API responses to shared types
// Maps real consumer API response to SessionCore contract

import {
  SessionCore,
  WeekdayId,
  SessionType,
  SESSION_TYPE_FROM_ARABIC,
  WEEKDAY_ORDER,
} from '../types/scheduleCore';
import { AdminSessionDetails, BookingDetails } from '../types/adminSchedule';

/**
 * Real Consumer API Response Shape (from GET /v1/sessions):
 * {
 *   id: string;              // MongoDB _id
 *   title: string;           // e.g., "Core Strength"
 *   startsAt: string;        // ISO UTC e.g., "2025-12-21T07:00:00.000Z"
 *   durationMin: number;     // e.g., 60
 *   capacity: number;        // e.g., 6
 *   bookedCount: number;     // e.g., 0
 *   availableSeats: number;  // computed: capacity - bookedCount (sanity check only)
 *   instructorName?: string; // e.g., "Emma Davis"
 *   locationName?: string;   // e.g., "Main Hall"
 *   status: string;          // "scheduled" | "canceled"
 * }
 */

/**
 * Convert JS Date day index (0=Sunday) to WeekdayId
 */
export const dayIndexToWeekdayId = (dayIndex: number): WeekdayId => {
  const normalized = ((dayIndex % 7) + 7) % 7;
  return WEEKDAY_ORDER[normalized];
};

/**
 * Convert WeekdayId to day index (0=Sunday)
 */
export const weekdayIdToDayIndex = (weekday: WeekdayId): number => {
  return WEEKDAY_ORDER.indexOf(weekday);
};

/**
 * Extract weekday from ISO date string
 */
export const getWeekdayFromISO = (isoString: string): WeekdayId => {
  const date = new Date(isoString);
  return dayIndexToWeekdayId(date.getDay());
};

/**
 * Format time to "HH:mm" (24h format)
 */
export const formatTimeTo24h = (timeStr: string | Date): string => {
  if (timeStr instanceof Date) {
    const hours = timeStr.getHours().toString().padStart(2, '0');
    const minutes = timeStr.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // If already in HH:mm format
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // Parse ISO string
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // Fallback: try to extract time from string
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    return `${hours}:${minutes}`;
  }
  
  return '00:00';
};

/**
 * Calculate end time from start time and duration
 */
export const calculateEndTime = (startTimeISO: string, durationMin: number): string => {
  const date = new Date(startTimeISO);
  date.setMinutes(date.getMinutes() + durationMin);
  return formatTimeTo24h(date);
};

/**
 * Ensure startTime < endTime, distinguishing two cases when start > end:
 *   - reversal (user entered them backwards) → swap
 *   - cross-midnight crossover (e.g. 23:00 → 00:30) → preserve as-is
 *
 * Heuristic: if the *forward* distance from start to end (going through
 * midnight) is < 6 hours, it's a session that legitimately ends next day.
 * Otherwise it's a reversal mistake and we swap.
 */
export const normalizeTimeOrder = (
  startTime: string,
  endTime: string
): { startTime: string; endTime: string; wasReversed: boolean } => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return { startTime, endTime, wasReversed: false };
  }

  // startMinutes > endMinutes — either crossover or reversal.
  const forwardDistanceMin = (24 * 60 - startMinutes) + endMinutes;
  if (forwardDistanceMin < 6 * 60) {
    // Cross-midnight session — preserve next-day semantics.
    return { startTime, endTime, wasReversed: false };
  }

  // Reversal — user entered the times backwards.
  return {
    startTime: endTime,
    endTime: startTime,
    wasReversed: true,
  };
};

/**
 * Infer SessionType from Arabic title text
 */
export const inferSessionType = (title: string): SessionType => {
  // Direct match
  if (SESSION_TYPE_FROM_ARABIC[title]) {
    return SESSION_TYPE_FROM_ARABIC[title];
  }
  
  // Partial match
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('بيلاتس') && lowerTitle.includes('أجهزة')) {
    return 'pilates_reformer';
  }
  if (lowerTitle.includes('بيلاتس') && lowerTitle.includes('مات')) {
    return 'pilates_mat';
  }
  if (lowerTitle.includes('بيلاتس')) {
    return 'pilates_reformer';
  }
  if (lowerTitle.includes('يوغا') || lowerTitle.includes('يوجا')) {
    return 'yoga';
  }
  if (lowerTitle.includes('قوة') || lowerTitle.includes('تمارين')) {
    return 'strength';
  }
  
  return 'other';
};

/**
 * Clamp occupiedCount to not exceed capacityTotal
 */
export const clampOccupiedCount = (
  occupied: number,
  total: number
): { occupiedCount: number; wasClamped: boolean } => {
  if (occupied > total) {
    return { occupiedCount: total, wasClamped: true };
  }
  if (occupied < 0) {
    return { occupiedCount: 0, wasClamped: true };
  }
  return { occupiedCount: occupied, wasClamped: false };
};

/**
 * Map consumer API session response to SessionCore
 * 
 * Expected API shape:
 * {
 *   id: string;
 *   title: string;
 *   startsAt: string; // ISO
 *   durationMin: number;
 *   capacity: number;
 *   bookedCount: number;
 *   availableSeats: number;
 *   instructorName?: string;
 *   locationName?: string;
 *   status: string;
 * }
 */
export const mapApiToSessionCore = (api: any): SessionCore => {
  const startsAt = api.startsAt || api.starts_at || api.startTime || '';
  const startTime = formatTimeTo24h(startsAt);
  
  // Calculate end time from duration or use provided endTime.
  // Use ?? so explicit zero values (0-minute "instant" slots) are preserved
  // rather than coerced to the 60-min default. (Review CLIENT-2.3.)
  let endTime: string;
  const explicitEndTime = api.endTime ?? api.ends_at ?? api.endsAt;
  const apiDuration = api.durationMin ?? api.duration_min ?? api.duration;
  if (explicitEndTime !== undefined && explicitEndTime !== null) {
    endTime = formatTimeTo24h(explicitEndTime);
  } else if (apiDuration !== undefined && apiDuration !== null) {
    endTime = calculateEndTime(startsAt, apiDuration);
  } else {
    endTime = calculateEndTime(startsAt, 60); // Default 60 min
  }
  
  // Normalize time order
  const { startTime: normalizedStart, endTime: normalizedEnd } = normalizeTimeOrder(startTime, endTime);
  
  // Get weekday
  const weekday = getWeekdayFromISO(startsAt);
  
  // Get title
  const title = api.title || api.titleAr || api.name || '';
  
  // Infer session type
  const type = api.type ? (api.type as SessionType) : inferSessionType(title);
  
  // Get capacity and occupied count.
  // Use ?? so an explicit capacity of 0 (a "closed" session) is preserved
  // rather than coerced to a stale capacityTotal/total_capacity alias.
  // (Review CLIENT-2.3.)
  const capacityTotal = api.capacity ?? api.capacityTotal ?? api.total_capacity ?? 0;
  
  // Derive occupiedCount - prefer bookedCount, fallback to capacity - availableSeats
  let rawOccupied: number;
  if (typeof api.bookedCount === 'number') {
    rawOccupied = api.bookedCount;
  } else if (typeof api.booked_count === 'number') {
    rawOccupied = api.booked_count;
  } else if (typeof api.occupiedCount === 'number') {
    rawOccupied = api.occupiedCount;
  } else if (typeof api.availableSeats === 'number') {
    rawOccupied = capacityTotal - api.availableSeats;
  } else if (typeof api.available_seats === 'number') {
    rawOccupied = capacityTotal - api.available_seats;
  } else {
    rawOccupied = 0;
  }
  
  // Clamp occupied count
  const { occupiedCount } = clampOccupiedCount(rawOccupied, capacityTotal);
  
  return {
    id: api.id || '',
    weekday,
    dateISO: startsAt,
    startTime: normalizedStart,
    endTime: normalizedEnd,
    type,
    titleAr: title,
    instructorName: api.instructorName || api.instructor_name || api.instructor,
    locationName: api.locationName || api.location_name || api.location,
    capacityTotal,
    occupiedCount,
    status: api.status,
  };
};

/**
 * Map API booking response to BookingDetails
 */
export const mapApiToBookingDetails = (api: any): BookingDetails => {
  return {
    id: api.id || api.reservationId || api.reservation_id || '',
    customerName: api.customerName || api.customer_name || api.name || api.user?.name || '',
    phone: api.phone || api.phoneNumber || api.phone_number || api.user?.phone,
    bedNumber: api.bedNumber || api.bed_number || api.bed,
    attended: api.attended ?? api.attendance ?? null,
    createdAt: api.createdAt || api.created_at,
    status: api.status,
  };
};

/**
 * Map admin API session details response to AdminSessionDetails
 * 
 * Expected API shape extends consumer shape with:
 * {
 *   ...sessionFields,
 *   bookings: Array<{
 *     id: string;
 *     customerName: string;
 *     phone?: string;
 *     bedNumber?: number;
 *     attended?: boolean;
 *   }>
 * }
 */
export const mapApiToAdminSessionDetails = (api: any): AdminSessionDetails => {
  const core = mapApiToSessionCore(api);
  
  // Map bookings array
  const rawBookings = api.bookings || api.reservations || [];
  const bookings: BookingDetails[] = rawBookings.map(mapApiToBookingDetails);

  // Only fall back to bookings.length when the API gave us no occupancy
  // signal at all. An explicit `bookedCount: 0` (or `availableSeats: capacity`)
  // means the session is genuinely empty and a stale bookings array must
  // not silently inflate the count. (Review CLIENT-2.4.)
  const hadOccupancySignal =
    typeof api.bookedCount === 'number' ||
    typeof api.booked_count === 'number' ||
    typeof api.occupiedCount === 'number' ||
    typeof api.availableSeats === 'number' ||
    typeof api.available_seats === 'number';

  let occupiedCount = core.occupiedCount;
  if (!hadOccupancySignal && bookings.length > 0) {
    const { occupiedCount: derived } = clampOccupiedCount(bookings.length, core.capacityTotal);
    occupiedCount = derived;
  }
  
  return {
    ...core,
    occupiedCount,
    bookings,
  };
};

/**
 * Map multiple API sessions to SessionCore array
 */
export const mapApiSessionsToCore = (apiSessions: any[]): SessionCore[] => {
  return apiSessions.map(mapApiToSessionCore);
};

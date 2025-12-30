// src/types/adminSchedule.ts
// Admin-only types extending the shared session contract

import { SessionCore } from './scheduleCore';

/**
 * Booking details - admin-only information about individual bookings
 */
export interface BookingDetails {
  /** Unique booking/reservation identifier */
  id: string;
  
  /** Customer's display name */
  customerName: string;
  
  /** Customer's phone number (optional) */
  phone?: string;
  
  /** Assigned bed/reformer number (1..N) */
  bedNumber?: number;
  
  /** Attendance status: true=attended, false=no-show, null=not yet marked */
  attended?: boolean | null;
  
  /** Booking creation timestamp */
  createdAt?: string;
  
  /** Booking status (active, cancelled, etc.) */
  status?: string;
}

/**
 * Admin session details - extends SessionCore with bookings list
 * 
 * This is loaded on-demand when admin opens "عرض التفاصيل" modal.
 * The bookings array is NOT included in the list endpoint for performance.
 */
export interface AdminSessionDetails extends SessionCore {
  /** List of bookings for this session */
  bookings: BookingDetails[];
}

/**
 * Admin session list item - same as SessionCore for list view
 * Bookings are loaded separately via details endpoint
 */
export type AdminSessionListItem = SessionCore;

/**
 * New session payload for creating a session (admin)
 */
export interface CreateSessionPayload {
  type: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
  capacity: number;
  instructorName?: string;
}

/**
 * Update session payload (admin)
 */
export interface UpdateSessionPayload {
  id: string;
  title?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  instructorName?: string;
}

/**
 * Add booking manually payload (admin)
 */
export interface AddBookingPayload {
  sessionId: string;
  customerName: string;
  phone?: string;
  bedNumber: number; // Required for all new bookings
}

// src/features/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../../config/env';
import { SessionCore } from '../../types/scheduleCore';
import { AdminSessionDetails, BookingDetails } from '../../types/adminSchedule';
import { mapApiToSessionCore, mapApiSessionsToCore, mapApiToAdminSessionDetails } from '../../mappers/scheduleMappers';

const TOKEN_KEY = 'connevia.access_token';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: ENV.API_URL + '/v1',
    prepareHeaders: async (headers) => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Sessions', 'MyReservations', 'Schedule', 'Reservations', 'Subscriptions', 'User', 'AdminSessions', 'SubscriptionPlans', 'MySubscription', 'MyUsage', 'PaymentSubmissions', 'AdminPaymentSubmissions', 'AdminScheduleSettings'],
  endpoints: (builder) => ({
    // Sessions endpoints
    getSessions: builder.query<
      { ok: boolean; sessions: Array<{
        id: string;
        title: string;
        startsAt: string;
        durationMin: number;
        capacity: number;
        bookedCount: number;
        availableSeats: number;
        instructorName?: string;
        locationName?: string;
        status: string;
      }> },
      { from?: string; to?: string }
    >({
      query: ({ from, to }) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        return `/sessions?${params.toString()}`;
      },
      providesTags: ['Sessions'],
    }),

    getSessionById: builder.query<
      { ok: boolean; session: {
        id: string;
        title: string;
        startsAt: string;
        durationMin: number;
        capacity: number;
        bookedCount: number;
        availableSeats: number;
        instructorName?: string;
        locationName?: string;
        status: string;
        bookedBeds?: number[]; // Array of taken bed numbers
      } },
      string
    >({
      query: (id) => `/sessions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Sessions', id }],
    }),

    // Reservations endpoints
    createReservation: builder.mutation<
      { ok: boolean; reservation: any },
      { sessionId: string; bedNumber: number }
    >({
      query: (body) => ({
        url: '/reservations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Sessions', 'MyReservations'],
    }),

    getMyReservations: builder.query<
      { ok: boolean; reservations: Array<{
        reservationId: string;
        bedNumber: number;
        status: string;
        createdAt: string;
        canceledAt?: string;
        session: {
          id: string;
          title: string;
          startsAt: string;
          durationMin: number;
          instructorName?: string;
          locationName?: string;
        };
      }> },
      { mode: 'upcoming' | 'past'; from?: string; to?: string; limit?: number }
    >({
      query: ({ mode, from, to, limit }) => {
        const params = new URLSearchParams();
        params.append('mode', mode);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (limit) params.append('limit', String(limit));
        return `/reservations/my?${params.toString()}`;
      },
      providesTags: (_result, _error, arg) => [
        { type: 'MyReservations', id: arg.mode },
        'MyReservations',
      ],
    }),

    cancelReservation: builder.mutation<
      { ok: boolean; reservation: any },
      { reservationId: string }
    >({
      query: ({ reservationId }) => ({
        url: `/reservations/${reservationId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Sessions', 'MyReservations'],
    }),

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    // Admin: Get sessions list (without bookings for performance)
    getAdminSessions: builder.query<
      { ok: boolean; sessions: SessionCore[] },
      { from?: string; to?: string }
    >({
      query: ({ from, to }) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        return `/admin/schedule/sessions?${params.toString()}`;
      },
      transformResponse: (response: { ok: boolean; sessions: any[] }) => ({
        ok: response.ok,
        sessions: mapApiSessionsToCore(response.sessions || []),
      }),
      providesTags: ['AdminSessions'],
    }),

    // Admin: Get session details with bookings
    getAdminSessionDetails: builder.query<
      { ok: boolean; session: AdminSessionDetails },
      string
    >({
      query: (sessionId) => `/admin/schedule/sessions/${sessionId}`,
      transformResponse: (response: { ok: boolean; session: any }) => ({
        ok: response.ok,
        session: mapApiToAdminSessionDetails(response.session || {}),
      }),
      providesTags: (_result, _error, id) => [{ type: 'AdminSessions', id }],
    }),

    // Admin: Create new session
    createAdminSession: builder.mutation<
      { ok: boolean; session: any },
      {
        title: string;
        startsAt: string;
        durationMin: number;
        capacity: number;
        type?: string;
        instructorName?: string;
      }
    >({
      query: (body) => ({
        url: '/admin/schedule/sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminSessions', 'Sessions'],
    }),

    // Admin: Update session
    updateAdminSession: builder.mutation<
      { ok: boolean; session: any },
      {
        sessionId: string;
        title?: string;
        startsAt?: string;
        durationMin?: number;
        capacity?: number;
        type?: string;
        instructorName?: string;
      }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/admin/schedule/sessions/${sessionId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminSessions', 'Sessions'],
    }),

    // Admin: Cancel/delete session
    cancelAdminSession: builder.mutation<
      { ok: boolean },
      { sessionId: string }
    >({
      query: ({ sessionId }) => ({
        url: `/admin/schedule/sessions/${sessionId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['AdminSessions', 'Sessions'],
    }),

    // Admin: Add booking manually
    addAdminBooking: builder.mutation<
      { ok: boolean; booking: any },
      {
        sessionId: string;
        customerName: string;
        phone?: string;
        bedNumber?: number;
      }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/admin/schedule/sessions/${sessionId}/bookings`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminSessions', 'Sessions'],
    }),

    // Admin: Delete booking
    deleteAdminBooking: builder.mutation<
      { ok: boolean },
      { sessionId: string; bookingId: string }
    >({
      query: ({ sessionId, bookingId }) => ({
        url: `/admin/schedule/sessions/${sessionId}/bookings/${bookingId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminSessions', 'Sessions'],
    }),

    // ============================================
    // SUBSCRIPTION & PAYMENT ENDPOINTS
    // ============================================

    // Get subscription plans (public) - Only 2 plans: 4 sessions (250 NIS) and 8 sessions (450 NIS)
    getSubscriptionPlans: builder.query<
      { ok: boolean; plans: Array<{
        id: string;
        name: string;
        monthlyLimit: number; // 4 or 8 sessions per month
        price: number;
        priceFormatted: string;
      }> },
      void
    >({
      query: () => '/subscription-plans',
      providesTags: ['SubscriptionPlans'],
    }),

    // Get current user subscription (shape: current/next/pending)
    getMySubscription: builder.query<
      { 
        ok: boolean;
        current: {
          _id: string;
          plan: {
            _id: string;
            name: string;
            monthlyLimit: number;
            price: number;
          } | null;
          status: 'active' | 'expired' | 'cancelled';
          startDate: string;
          endDate: string;
        } | null;
        next: {
          _id: string;
          plan: {
            _id: string;
            name: string;
            monthlyLimit: number;
            price: number;
          } | null;
          startDate: string;
          endDate: string;
        } | null;
        pending: {
          _id: string;
          requestedAction: 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';
          planId: string;
          plan: {
            _id: string;
            name: string;
            monthlyLimit: number;
            price: number;
          } | null;
          method: 'cash' | 'bank_transfer';
          proofUrl: string | null;
          targetStartDate: string;
          targetEndDate: string;
          submittedAt: string;
        } | null;
      },
      void
    >({
      query: () => '/me/subscription',
      providesTags: ['MySubscription'],
    }),

    // Get monthly + weekly usage
    getMySubscriptionUsage: builder.query<
      { ok: boolean; usage: {
        // Weekly (global cap of 3)
        weekStartISO: string;
        weekEndISO: string;
        weeklyLimit: number; // Always 3
        weeklyUsed: number;
        weeklyLeft: number;
        // Monthly (based on subscription)
        subStartISO: string;
        subEndISO: string;
        monthlyLimit: number; // 4 or 8
        monthlyUsed: number;
        monthlyLeft: number;
      } | null; message?: string },
      void
    >({
      query: () => '/me/subscription/usage',
      providesTags: ['MyUsage'],
    }),

    // Submit payment with requestedAction-based logic
    createPaymentSubmission: builder.mutation<
      { ok: boolean; pending: {
        _id: string;
        requestedAction: 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';
        planId: string;
        plan: {
          _id: string;
          name: string;
          monthlyLimit: number;
          price: number;
        };
        method: 'cash' | 'bank_transfer';
        proofUrl: string | null;
        targetStartDate: string;
        targetEndDate: string;
        submittedAt: string;
      } },
      { 
        planId: string; 
        method: 'cash' | 'bank_transfer'; 
        requestedAction: 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';
        proofUrl?: string;
      }
    >({
      query: (body) => ({
        url: '/me/payments/submissions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PaymentSubmissions', 'MySubscription'],
    }),

    // Get my payment submissions
    getMyPaymentSubmissions: builder.query<
      { ok: boolean; submissions: Array<{
        _id: string;
        requestedAction: 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';
        planId: string | null;
        plan: {
          _id: string;
          name: string;
          monthlyLimit: number;
          price: number;
        } | null;
        method: 'cash' | 'bank_transfer';
        proofUrl: string | null;
        status: 'submitted' | 'approved' | 'rejected' | 'cancelled';
        adminNote?: string;
        submittedAt: string;
        approvedAt?: string;
        targetStartDate?: string;
        targetEndDate?: string;
      }> },
      void
    >({
      query: () => '/me/payments/submissions',
      providesTags: ['PaymentSubmissions'],
    }),

    // Admin: Get payment submissions
    getAdminPaymentSubmissions: builder.query<
      { ok: boolean; submissions: Array<{
        _id: string;
        user: {
          _id: string;
          fullName: string;
          email: string;
        } | null;
        requestedAction: 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';
        plan: {
          _id: string;
          name: string;
          monthlyLimit: number;
          price: number;
        } | null;
        method: 'cash' | 'bank_transfer';
        proofUrl: string | null;
        status: 'submitted' | 'approved' | 'rejected' | 'cancelled';
        adminNote?: string;
        submittedAt: string;
        approvedAt?: string;
        targetStartDate?: string;
        targetEndDate?: string;
      }> },
      { status?: 'submitted' | 'approved' | 'rejected' | 'cancelled' }
    >({
      query: ({ status }) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        return `/admin/payments/submissions?${params.toString()}`;
      },
      providesTags: ['AdminPaymentSubmissions'],
    }),

    // Admin: Approve payment submission
    approvePaymentSubmission: builder.mutation<
      { ok: boolean; submission: any; subscription: any },
      { id: string; adminNote?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/payments/submissions/${id}/approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminPaymentSubmissions', 'MySubscription', 'PaymentSubmissions'],
    }),

    // Admin: Reject payment submission
    rejectPaymentSubmission: builder.mutation<
      { ok: boolean; submission: any },
      { id: string; adminNote?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/payments/submissions/${id}/reject`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminPaymentSubmissions', 'PaymentSubmissions'],
    }),

    // ============================================
    // ADMIN SCHEDULE SETTINGS ENDPOINTS
    // ============================================

    // Get schedule settings
    getAdminScheduleSettings: builder.query<
      {
        ok: boolean;
        timezone: string;
        weekStart: string;
        days: Array<{
          dayOfWeek: number;
          enabled: boolean;
          workPeriods: Array<{
            id: string;
            startTime: string;
            endTime: string;
          }>;
        }>;
      },
      void
    >({
      query: () => '/admin/schedule/settings',
      providesTags: ['AdminScheduleSettings'],
    }),

    // Update schedule settings
    updateAdminScheduleSettings: builder.mutation<
      {
        ok: boolean;
        timezone: string;
        weekStart: string;
        days: Array<{
          dayOfWeek: number;
          enabled: boolean;
          workPeriods: Array<{
            id: string;
            startTime: string;
            endTime: string;
          }>;
        }>;
      },
      {
        days: Array<{
          dayOfWeek: number;
          enabled: boolean;
          workPeriods: Array<{
            id: string;
            startTime: string;
            endTime: string;
          }>;
        }>;
      }
    >({
      query: (body) => ({
        url: '/admin/schedule/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['AdminScheduleSettings'],
    }),

    // Generate sessions
    generateAdminSessions: builder.mutation<
      {
        ok: boolean;
        created: number;
        skipped: number;
        wouldCreate?: number;
        details: Array<{
          dayOfWeek: number;
          periodId: string;
          created: number;
          skipped: number;
        }>;
      },
      {
        durationMinutes: number;
        dayOfWeeks: number[];
        range?: {
          startDate?: string;
          weeks?: number;
        };
        dryRun?: boolean;
      }
    >({
      query: (body) => ({
        url: '/admin/schedule/generate-sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminSessions'],
    }),
  }),
});

export const {
  // Consumer hooks
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useCreateReservationMutation,
  useGetMyReservationsQuery,
  useCancelReservationMutation,
  // Subscription hooks
  useGetSubscriptionPlansQuery,
  useGetMySubscriptionQuery,
  useGetMySubscriptionUsageQuery,
  useCreatePaymentSubmissionMutation,
  useGetMyPaymentSubmissionsQuery,
  // Admin hooks
  useGetAdminSessionsQuery,
  useGetAdminSessionDetailsQuery,
  useLazyGetAdminSessionDetailsQuery,
  useCreateAdminSessionMutation,
  useUpdateAdminSessionMutation,
  useCancelAdminSessionMutation,
  useAddAdminBookingMutation,
  useDeleteAdminBookingMutation,
  // Admin payment hooks
  useGetAdminPaymentSubmissionsQuery,
  useApprovePaymentSubmissionMutation,
  useRejectPaymentSubmissionMutation,
  // Admin schedule settings hooks
  useGetAdminScheduleSettingsQuery,
  useUpdateAdminScheduleSettingsMutation,
  useGenerateAdminSessionsMutation,
} = apiSlice;

// src/features/api/apiSlice.ts
import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../../config/env';
import { SessionCore } from '../../types/scheduleCore';
import { AdminSessionDetails, BookingDetails } from '../../types/adminSchedule';
import { mapApiToSessionCore, mapApiSessionsToCore, mapApiToAdminSessionDetails } from '../../mappers/scheduleMappers';
import { logout } from '../auth/authSlice';
import { resetToLogin } from '../../navigation/navigationRef';

const TOKEN_KEY = 'connevia.access_token';

// Flag to prevent multiple 401 logout triggers
let isLoggingOut = false;

// Base query with token injection
const rawBaseQuery = fetchBaseQuery({
  baseUrl: ENV.API_URL + '/v1',
  timeout: 15000,
  prepareHeaders: async (headers) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Wrapper that handles 401 responses
const baseQueryWith401Handler: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  // Check for 401 Unauthorized
  if (result.error && result.error.status === 401) {
    // Check for ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED specific error
    const errorData = result.error.data as { error?: string } | undefined;
    const errorCode = errorData?.error;
    
    if (!isLoggingOut) {
      isLoggingOut = true;

      if (__DEV__) {
        if (errorCode === 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED') {
          console.log('[API] 401 ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED - forcing logout');
        } else {
          console.log('[API] 401 Unauthorized - BEFORE dispatch(logout)');
        }
      }

      // Clear token from SecureStore
      await SecureStore.deleteItemAsync(TOKEN_KEY);

      // Dispatch logout to clear auth state
      api.dispatch(logout());

      if (__DEV__) {
        console.log('[API] 401 - AFTER dispatch(logout), calling resetToLogin');
      }

      // Reset navigation to Login (safe, checks isReady internally)
      resetToLogin();

      if (__DEV__) {
        console.log('[API] 401 - AFTER resetToLogin');
      }

      // Reset flag after a short delay to allow re-attempts after re-login
      setTimeout(() => {
        isLoggingOut = false;
      }, 2000);
    } else {
      if (__DEV__) {
        console.log('[API] 401 - SKIPPED (isLoggingOut=true)');
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWith401Handler,
  tagTypes: ['Sessions', 'MyReservations', 'Schedule', 'Reservations', 'Subscriptions', 'User', 'Me', 'AdminSessions', 'SubscriptionPlans', 'MySubscription', 'MyUsage', 'PaymentSubmissions', 'AdminPaymentSubmissions', 'AdminScheduleSettings', 'AdminCustomers', 'AdminCustomer'],
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
    // ME (Profile)
    // ============================================
    
    // New response type with nested health object
    getMe: builder.query<
      {
        ok: boolean;
        user: {
          id: string;
          auth0Id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          fullName: string;
          phone?: string;
          health: {
            age?: number;
            weight?: number;
            healthStatus?: string;
          };
          role: 'customer' | 'admin';
          profileCompleted: boolean;
          createdAt: string;
          updatedAt: string;
        };
      },
      void
    >({
      query: () => '/me',
      providesTags: ['Me'],
    }),

    // PATCH /v1/me - Update personal info only (firstName, lastName, phone)
    patchMe: builder.mutation<
      {
        ok: boolean;
        user: {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          fullName: string;
          phone?: string;
          health: {
            age?: number;
            weight?: number;
            healthStatus?: string;
          };
          profileCompleted: boolean;
        };
      },
      {
        firstName: string;
        lastName: string;
        phone: string;
      }
    >({
      query: (body) => ({
        url: '/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),

    // PATCH /v1/me/health - Update health info only (age, weight, healthStatus)
    patchMyHealth: builder.mutation<
      {
        ok: boolean;
        user: {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          fullName: string;
          phone?: string;
          health: {
            age?: number;
            weight?: number;
            healthStatus?: string;
          };
          profileCompleted: boolean;
        };
      },
      {
        age: number;
        weight: number;
        healthStatus?: string;
      }
    >({
      query: (body) => ({
        url: '/me/health',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),

    // PATCH /v1/me/full - Legacy endpoint for CompleteProfileWizard
    patchMeFull: builder.mutation<
      {
        ok: boolean;
        user: {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          fullName: string;
          phone?: string;
          health: {
            age?: number;
            weight?: number;
            healthStatus?: string;
          };
          profileCompleted: boolean;
        };
      },
      {
        firstName: string;
        lastName: string;
        phone: string;
        age: number;
        weight: number;
        healthCondition: string;
      }
    >({
      query: (body) => ({
        url: '/me/full',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),

    // POST /v1/me/bootstrap - Bootstrap user after Auth0 login
    bootstrapMe: builder.mutation<
      { ok: boolean; me: { id: string; email: string; fullName: string; role: string; profileCompleted: boolean; subscriptionStatus: string; createdAt: string } },
      void
    >({
      query: () => ({
        url: '/me/bootstrap',
        method: 'POST',
      }),
      invalidatesTags: ['Me'],
    }),

    // DELETE /v1/me - Delete account and personal data
    deleteMe: builder.mutation<
      { ok: boolean; auth0Deleted: boolean },
      void
    >({
      query: () => ({
        url: '/me',
        method: 'DELETE',
      }),
      invalidatesTags: ['Me', 'MySubscription', 'MyUsage', 'PaymentSubmissions', 'Reservations'],
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
        capacity?: number;
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

    // ============================================
    // ADMIN CUSTOMERS
    // ============================================

    // GET /v1/admin/customers - List customers with filters
    adminGetCustomers: builder.query<
      {
        ok: boolean;
        items: Array<{
          id: string;
          firstName: string | null;
          lastName: string | null;
          phone: string | null;
          email: string;
          health: {
            age: number | null;
            weight: number | null;
            healthStatus: string | null;
          };
          subscription: {
            status: string;
            planName: string | null;
            endDate: string | null;
          } | null;
          usage: {
            monthlyUsed: number;
            monthlyLimit: number;
            weeklyUsed: number;
            weeklyLimit: number;
            lifetime: number;
          };
        }>;
        page: number;
        limit: number;
        total: number;
      },
      {
        q?: string;
        status?: 'all' | 'active' | 'expiring' | 'expired' | 'no-subscription';
        activeOnly?: 'true' | 'false';
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: '/admin/customers',
        params,
      }),
      providesTags: ['AdminCustomers'],
    }),

    // GET /v1/admin/customers/:customerId - Get customer details
    adminGetCustomerDetails: builder.query<
      {
        ok: boolean;
        id: string;
        personal: {
          firstName: string | null;
          lastName: string | null;
          phone: string | null;
          email: string;
        };
        health: {
          age: number | null;
          weight: number | null;
          healthStatus: string | null;
        };
        subscription: {
          status: string;
          planId: string;
          planName: string | null;
          startDate: string;
          endDate: string;
        } | null;
        usage: {
          monthlyUsed: number;
          monthlyLimit: number;
          monthlyLeft: number;
          weeklyUsed: number;
          weeklyLimit: number;
          weeklyLeft: number;
          lifetime: number;
        };
        reservations: {
          items: Array<{
            id: string;
            startAt: string | null;
            status: string;
            coachName: string | null;
          }>;
          total: number;
        };
        notes: {
          adminNotes: string | null;
        };
      },
      string
    >({
      query: (customerId) => `/admin/customers/${customerId}`,
      providesTags: (_result, _error, customerId) => [
        { type: 'AdminCustomer', id: customerId },
      ],
    }),

    // PATCH /v1/admin/customers/:customerId/personal
    adminPatchCustomerPersonal: builder.mutation<
      {
        ok: boolean;
        personal: {
          firstName: string | null;
          lastName: string | null;
          phone: string | null;
          email: string;
        };
      },
      {
        customerId: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      }
    >({
      query: ({ customerId, ...body }) => ({
        url: `/admin/customers/${customerId}/personal`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { customerId }) => [
        { type: 'AdminCustomer', id: customerId },
        'AdminCustomers',
      ],
    }),

    // PATCH /v1/admin/customers/:customerId/health
    adminPatchCustomerHealth: builder.mutation<
      {
        ok: boolean;
        health: {
          age: number | null;
          weight: number | null;
          healthStatus: string | null;
        };
      },
      {
        customerId: string;
        age?: number;
        weight?: number;
        healthStatus?: string;
      }
    >({
      query: ({ customerId, ...body }) => ({
        url: `/admin/customers/${customerId}/health`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { customerId }) => [
        { type: 'AdminCustomer', id: customerId },
        'AdminCustomers',
      ],
    }),

    // PATCH /v1/admin/customers/:customerId/notes
    adminPatchCustomerNotes: builder.mutation<
      {
        ok: boolean;
        notes: {
          adminNotes: string | null;
        };
      },
      {
        customerId: string;
        adminNotes?: string;
      }
    >({
      query: ({ customerId, ...body }) => ({
        url: `/admin/customers/${customerId}/notes`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { customerId }) => [
        { type: 'AdminCustomer', id: customerId },
      ],
    }),

    // PATCH /v1/admin/customers/:customerId/subscription
    adminPatchCustomerSubscription: builder.mutation<
      {
        ok: boolean;
        subscription: {
          status: string;
          planId: string;
          planName: string | null;
          startDate: string;
          endDate: string;
        };
      },
      {
        customerId: string;
        status?: string;
        endDate?: string;
        planId?: string;
      }
    >({
      query: ({ customerId, ...body }) => ({
        url: `/admin/customers/${customerId}/subscription`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { customerId }) => [
        { type: 'AdminCustomer', id: customerId },
        'AdminCustomers',
      ],
    }),

    // ============================================
    // ADMIN DASHBOARD ENDPOINTS
    // ============================================

    // GET /v1/admin/dashboard/summary - Dashboard stats
    adminDashboardSummary: builder.query<
      {
        ok: boolean;
        date: string;
        stats: {
          todayBookings: number;
          weekBookings: number;
          occupancyRateToday: number;
          pendingPayments: number;
          expiringMemberships: number;
        };
      },
      { date: string }
    >({
      query: ({ date }) => `/admin/dashboard/summary?date=${date}`,
    }),

    // GET /v1/admin/dashboard/today-bookings - Today's bookings list
    adminTodayBookings: builder.query<
      {
        ok: boolean;
        date: string;
        bookings: Array<{
          id: string;
          customerId: string | null;
          customerName: string;
          sessionType: string;
          startTime: string;
          endTime: string;
          bedNumber: number;
          attendance: 'unknown' | 'attended' | 'absent';
        }>;
      },
      { date: string }
    >({
      query: ({ date }) => `/admin/dashboard/today-bookings?date=${date}`,
    }),

    // GET /v1/admin/dashboard/notifications - Recent notifications
    adminNotifications: builder.query<
      {
        ok: boolean;
        notifications: Array<{
          id: string;
          type: 'booking_created' | 'booking_cancelled' | 'payment_pending' | 'membership_expiring';
          textAr: string;
          createdAt: string;
        }>;
      },
      { limit?: number }
    >({
      query: ({ limit }) => `/admin/dashboard/notifications?limit=${limit || 20}`,
    }),

    // PATCH /v1/admin/dashboard/bookings/:id/attendance - Update attendance
    updateBookingAttendance: builder.mutation<
      {
        ok: boolean;
        id: string;
        attendance: 'attended' | 'absent';
      },
      { id: string; attendance: 'attended' | 'absent' }
    >({
      query: ({ id, attendance }) => ({
        url: `/admin/dashboard/bookings/${id}/attendance`,
        method: 'PATCH',
        body: { attendance },
      }),
    }),

    // ============================================
    // ADMIN JOBS (Debug/Manual Trigger)
    // ============================================

    // POST /v1/admin/jobs/run-midnight - Manually trigger midnight job
    adminRunMidnightJob: builder.mutation<
      {
        ok: boolean;
        message: string;
        result: {
          success: boolean;
          startedAt: string;
          completedAt: string;
          durationMs: number;
          stats: {
            activeSubsChecked: number;
            subsExpired: number;
            usersUpdated: number;
          };
          errors?: string[];
        };
      },
      void
    >({
      query: () => ({
        url: '/admin/jobs/run-midnight',
        method: 'POST',
      }),
      invalidatesTags: ['AdminCustomers', 'AdminCustomer'],
    }),

    // GET /v1/admin/jobs/status - Get job status
    adminGetJobStatus: builder.query<
      {
        ok: boolean;
        jobs: {
          'daily-midnight-subscription-expiry': {
            lastRunAt: string | null;
            lastRunDurationMs: number | null;
            lastRunResult: 'success' | 'error' | null;
            lastRunError: string | null;
            lockedUntil: string | null;
            lockedBy: string | null;
          };
        };
      },
      void
    >({
      query: () => '/admin/jobs/status',
    }),

    // ============================================
    // ADMIN CUSTOMER SEARCH & ADD TO SESSION
    // ============================================

    // GET /v1/admin/customers/search - Search active customers for typeahead
    adminSearchCustomers: builder.query<
      {
        ok: boolean;
        customers: Array<{
          id: string;
          fullName: string;
          email: string;
          phone?: string;
        }>;
      },
      { q: string; limit?: number }
    >({
      query: ({ q, limit }) => `/admin/customers/search?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ''}`,
    }),

    // POST /v1/admin/customers/sessions/:sessionId/add-customer - Add customer to session
    adminAddCustomerToSession: builder.mutation<
      {
        ok: boolean;
        sessionId: string;
        addedCustomerId: string;
        reservationId?: string;
        bedNumber?: number;
        alreadyBooked?: boolean;
      },
      { sessionId: string; customerId: string }
    >({
      query: ({ sessionId, customerId }) => ({
        url: `/admin/customers/sessions/${sessionId}/add-customer`,
        method: 'POST',
        body: { customerId },
      }),
      invalidatesTags: ['AdminSessions', 'Sessions'],
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
  // Me (Profile) hooks
  useGetMeQuery,
  usePatchMeMutation,
  usePatchMyHealthMutation,
  usePatchMeFullMutation,
  useBootstrapMeMutation,
  useDeleteMeMutation,
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
  // Admin customers hooks
  useAdminGetCustomersQuery,
  useAdminGetCustomerDetailsQuery,
  useAdminPatchCustomerPersonalMutation,
  useAdminPatchCustomerHealthMutation,
  useAdminPatchCustomerNotesMutation,
  useAdminPatchCustomerSubscriptionMutation,
  // Admin dashboard hooks
  useAdminDashboardSummaryQuery,
  useAdminTodayBookingsQuery,
  useAdminNotificationsQuery,
  useUpdateBookingAttendanceMutation,
  // Admin customer search & add hooks
  useLazyAdminSearchCustomersQuery,
  useAdminAddCustomerToSessionMutation,
  // Admin jobs hooks
  useAdminRunMidnightJobMutation,
  useAdminGetJobStatusQuery,
} = apiSlice;

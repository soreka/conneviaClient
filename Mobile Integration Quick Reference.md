# Mobile Integration Quick Reference

## 🚀 Getting Started

### Base URL

```ts
const API_BASE = 'https://connevia.onrender.com'; // Production
// const API_BASE = 'http://localhost:4000'; // Local dev
```

### Authentication

All requests require Auth0 JWT token in header:

```ts
headers: {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
}
```

---

## 📱 Mobile App Flow

### 1. User Login (Auth0)

- **Use** existing `useAuth` hook to get `accessToken`.

### 2. Check User Profile

```http
GET /v1/auth/me
```

- **Returns** user info from JWT (no DB lookup needed).

### 3. Check Subscription Status

```http
GET /v1/subscriptions/my
```

- If `subscription === null`: Show subscription selection screen.
- If `subscription.status === 'active'`: Proceed to schedule.

### 4. View Available Plans (if needed)

```http
GET /v1/subscriptions/plans
```

- Display 3 plans:
  - Silver (1x)
  - Gold (2x)
  - Platinum (3x)

### 5. View Weekly Schedule

```http
GET /v1/schedule?startDate=2025-12-08T00:00:00Z&endDate=2025-12-14T23:59:59Z
```

- Show sessions with `availableSpots` indicator.

### 6. Book a Session

```http
POST /v1/reservations
Content-Type: application/json

{
  "classSessionId": "..."
}
```

**Handle errors:**

- `"Session is full"` → Show "Fully Booked" badge
- `"Weekly limit exceeded"` → Show upgrade prompt
- `"Health document required"` → Navigate to upload screen

### 7. View My Reservations

```http
GET /v1/reservations/my
```

- Show upcoming and past reservations.

### 8. Cancel a Reservation

```http
POST /v1/reservations/:id/cancel
```

**Handle errors:**

- `"Cannot cancel within 48 hours"` → Show policy message

---

## 🎨 UI/UX Recommendations

### Schedule Screen

**Session Card Example:**

```text
┌─────────────────────────────────┐
│ Monday, Dec 9 • 9:00 AM         │
│ Sarah Johnson                   │
│ ● 2/4 spots available           │ ← Green if >1, Yellow if 1, Red if 0
│                                 │
│ [Book Now]                      │ ← Disabled if full or limit reached
└─────────────────────────────────┘
```

**Capacity Indicator:**

- `availableSpots > 1`: Green dot + "X spots available"
- `availableSpots === 1`: Yellow dot + "1 spot left"
- `availableSpots === 0`: Red dot + "Fully booked"

### Reservation Flow

**Before Booking - Check:**

- User has active subscription
- User hasn't exceeded weekly limit
- User has uploaded health document

**Success State:**

```text
✅ Booking Confirmed!
Monday, Dec 9 at 9:00 AM
Trainer: Sarah Johnson

[View My Reservations]
```

**Error States:**

- **No Subscription:**

  ```text
  ⚠️ Subscription Required
  You need an active subscription to book classes.

  [View Plans]
  ```

- **Weekly Limit:**

  ```text
  ⚠️ Weekly Limit Reached
  You've used all 2 sessions this week.

  [Upgrade Plan]
  ```

- **Health Document:**

  ```text
  ⚠️ Health Document Required
  Please upload your health document before booking.

  [Upload Document]
  ```

### Cancellation Flow

**Show Warning:**

```text
Cancel Reservation?

Monday, Dec 9 at 9:00 AM
Trainer: Sarah Johnson

⚠️ Cancellations are only allowed up to 48 hours before the session.

[Cancel Reservation] [Keep Reservation]
```

**If within 48 hours:**

```text
❌ Cannot Cancel
Cancellations must be made at least 48 hours before the session start time.

[OK]
```

---

## 📊 State Management (RTK Query)

### API Slice Example

```ts
// src/features/schedule/scheduleApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAccessToken } from '@/services/auth';

export const scheduleApi = createApi({
  reducerPath: 'scheduleApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://connevia.onrender.com/v1',
    prepareHeaders: async (headers) => {
      const token = await getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Schedule', 'Reservations'],
  endpoints: (builder) => ({
    getSchedule: builder.query({
      query: ({ startDate, endDate }) => ({
        url: '/schedule',
        params: { startDate, endDate },
      }),
      providesTags: ['Schedule'],
    }),
    getMyReservations: builder.query({
      query: () => '/reservations/my',
      providesTags: ['Reservations'],
    }),
    createReservation: builder.mutation({
      query: (body) => ({
        url: '/reservations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Schedule', 'Reservations'],
    }),
    cancelReservation: builder.mutation({
      query: (id) => ({
        url: `/reservations/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Schedule', 'Reservations'],
    }),
  }),
});

export const {
  useGetScheduleQuery,
  useGetMyReservationsQuery,
  useCreateReservationMutation,
  useCancelReservationMutation,
} = scheduleApi;
```

### Usage in Screen

```tsx
// src/features/schedule/ScheduleScreen.tsx
import { useGetScheduleQuery, useCreateReservationMutation } from './scheduleApi';

export function ScheduleScreen() {
  const { data, isLoading, error } = useGetScheduleQuery({
    startDate: startOfWeek.toISOString(),
    endDate: endOfWeek.toISOString(),
  });

  const [createReservation, { isLoading: isBooking }] = useCreateReservationMutation();

  const handleBook = async (sessionId: string) => {
    try {
      await createReservation({ classSessionId: sessionId }).unwrap();
      Alert.alert('Success', 'Booking confirmed!');
    } catch (err: any) {
      Alert.alert('Error', err.data?.error || 'Failed to book session');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;

  return (
    <FlatList
      data={data?.sessions}
      renderItem={({ item }) => (
        <SessionCard
          session={item}
          onBook={() => handleBook(item.id)}
          isBooking={isBooking}
        />
      )}
    />
  );
}
```

---

## 🔄 Cache Invalidation Strategy

After successful mutations, invalidate relevant tags:

| Mutation            | Invalidates                    |
|---------------------|-------------------------------|
| `createReservation` | `['Schedule', 'Reservations']` |
| `cancelReservation` | `['Schedule', 'Reservations']` |
| `createSubscription`| `['Subscriptions']`            |

This ensures the UI automatically refetches and updates.

---

## 🧪 Testing Checklist

### Happy Path

- [ ] User can view schedule
- [ ] User can book available session
- [ ] User can view their reservations
- [ ] User can cancel reservation (>48h before)

### Edge Cases

- [ ] Booking when session is full → Show error
- [ ] Booking when weekly limit reached → Show error
- [ ] Booking without health document → Show error
- [ ] Cancelling within 48 hours → Show error
- [ ] Cancelling already-cancelled reservation → Show error

### Network Errors

- [ ] Handle 401 (expired token) → Re-login
- [ ] Handle 500 (server error) → Show retry
- [ ] Handle offline → Show cached data + offline indicator

---

## 🎯 Key Business Rules (Mobile Must Enforce)

### Before Booking

- ✅ Check `session.availableSpots > 0`
- ✅ Check user has active subscription
- ✅ Check user hasn't exceeded weekly limit
- ✅ Check user has uploaded health document

### Before Cancelling

- ✅ Calculate hours until session: `(session.startTime - now) / (1000 * 60 * 60)`
- ✅ Show warning if `hours < 48`
- ✅ Disable cancel button if within 48 hours

### UI Indicators

- Show "Fully Booked" badge if `availableSpots === 0`
- Show "X/Y spots left" if `availableSpots > 0`
- Show "Upgrade Plan" if weekly limit reached
- Show "Upload Health Doc" if missing

---

## 📞 Support & Debugging

### Common Issues

- **"User not found" error:**
  - User exists in Auth0 but not in MongoDB
  - **Solution:** Create user record on first login

- **"No active subscription" error:**
  - User hasn't subscribed yet
  - **Solution:** Navigate to subscription selection screen

- **"Health document required" error:**
  - User hasn't uploaded document
  - **Solution:** Navigate to upload screen

### Debug Endpoints

**Check API health:**

```bash
curl https://connevia.onrender.com/health
```

**Check user info:**

```bash
curl -H "Authorization: Bearer TOKEN" \
  https://connevia.onrender.com/v1/auth/me
```

---

## 🚦 Next Steps for Mobile Team

- Implement RTK Query slices for schedule, reservations, subscriptions
- Create UI components for session cards, booking flow, cancellation
- Add error handling for all business rule violations
- Implement health document upload (Phase 4)
- Add subscription creation flow (Phase 5)

For complete API reference, see `API_DOCUMENTATION.md`.

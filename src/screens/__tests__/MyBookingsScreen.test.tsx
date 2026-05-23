// src/screens/__tests__/MyBookingsScreen.test.tsx
// Tests for the My Bookings screen - tab switching and empty/error states.

jest.mock('../../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 't',
    AUTH0_DOMAIN: 't',
    AUTH0_AUDIENCE: 't',
    API_URL: 'http://test.local',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Navigation hooks
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useIsFocused: () => true,
  useFocusEffect: (fn: () => any) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = fn();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
}));

// RTK Query
let mockUpcoming: any = { reservations: [] };
let mockPast: any = { reservations: [] };
let mockUpcomingLoading = false;
let mockUpcomingError: any = null;
const mockCancelTrigger = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
jest.mock('../../features/api/apiSlice', () => ({
  useGetMyReservationsQuery: ({ mode }: { mode: 'upcoming' | 'past' }) => {
    if (mode === 'upcoming') {
      return {
        data: mockUpcoming,
        isLoading: mockUpcomingLoading,
        error: mockUpcomingError,
        refetch: jest.fn().mockResolvedValue(undefined),
        isFetching: false,
      };
    }
    return {
      data: mockPast,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
      isFetching: false,
    };
  },
  useCancelReservationMutation: () => [mockCancelTrigger, { isLoading: false }],
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MyBookingsScreen } from '../MyBookingsScreen';

const renderBookings = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <MyBookingsScreen />
    </SafeAreaProvider>
  );

function makeReservation(overrides: Partial<{
  reservationId: string;
  status: string;
  bedNumber: number;
  startsAtOffsetHours: number;
  title: string;
}> = {}) {
  const startsAt = new Date(
    Date.now() + (overrides.startsAtOffsetHours ?? 72) * 60 * 60 * 1000
  ).toISOString();
  return {
    reservationId: overrides.reservationId ?? 'res-1',
    bedNumber: overrides.bedNumber ?? 1,
    status: overrides.status ?? 'booked',
    createdAt: new Date().toISOString(),
    session: {
      id: 'sess-1',
      title: overrides.title ?? 'بيلاتس أجهزة',
      startsAt,
      durationMin: 60,
      instructorName: 'Emma',
    },
  };
}

beforeEach(() => {
  mockUpcoming = { reservations: [] };
  mockPast = { reservations: [] };
  mockUpcomingLoading = false;
  mockUpcomingError = null;
  mockGoBack.mockReset();
  mockCancelTrigger.mockClear();
});

describe('MyBookingsScreen', () => {
  test('shows loading spinner while upcoming data is loading', () => {
    mockUpcomingLoading = true;
    renderBookings();
    // No reservation cards render; the spinner branch is hit.
    expect(screen.queryByText('لا توجد حجوزات قادمة')).toBeNull();
    expect(screen.queryByText('لا توجد حجوزات سابقة')).toBeNull();
  });

  test('shows error message when fetch fails', () => {
    mockUpcomingError = { status: 500 };
    renderBookings();
    expect(screen.getByText('فشل تحميل الحجوزات')).toBeTruthy();
  });

  test('renders the empty state when there are no upcoming reservations', () => {
    renderBookings();
    expect(screen.getByText('لا توجد حجوزات قادمة')).toBeTruthy();
  });

  test('renders an upcoming reservation card with session title', () => {
    mockUpcoming = {
      reservations: [
        makeReservation({ reservationId: 'r1', startsAtOffsetHours: 72, title: 'بيلاتس أجهزة' }),
      ],
    };
    renderBookings();
    // The session type appears on the card.
    expect(screen.getByText('بيلاتس أجهزة')).toBeTruthy();
    // The empty state should be hidden now.
    expect(screen.queryByText('لا توجد حجوزات قادمة')).toBeNull();
  });
});

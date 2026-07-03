// src/screens/Admin/__tests__/AdminScheduleScreen.weekNav.test.tsx
//
// ADMIN-SCHED-NAV — Admin schedule week navigation (previous / current / next).
// ---------------------------------------------------------------------------
//
// CONTEXT
// `src/screens/Admin/AdminScheduleScreen.tsx` used to hardcode the CURRENT
// week:
//   const startOfWeek = getStartOfWeek(today, 0);
//   const endOfWeek   = startOfWeek + 6 days @ 23:59:59.999
//   useGetAdminSessionsQuery({ from: startOfWeek.toISOString(),
//                              to:   endOfWeek.toISOString() })
// So the admin could never see NEXT week (customers already can, via
// SCHED-NAV-01) NOR review PAST weeks. This adds BOUNDED week navigation for
// the admin. Unlike the customer screen (offset 0..1, tied to the 14-day
// booking horizon), the admin manages the whole schedule, so navigation is
// symmetric: past weeks (history/attendance) AND future weeks (planning),
// bounded to ±12 weeks. Switching weeks recomputes the query window (from/to
// shift ±7 days per offset).
//
// ACCESSIBILITY-LABEL CONTRACT:
//   - "previous week" control → accessibilityLabel="الأسبوع السابق"
//   - "next week" control     → accessibilityLabel="الأسبوع التالي"
//
// Behavioral render — mirrors `ScheduleScreen.weekNav.test.tsx`. The admin
// screen pulls in eight modal children, six RTK Query hooks, navigation,
// AppState, useFocusEffect and a LinearGradient; we neutralize that graph by
// mocking the child modules and the RTK hooks (capturing the query window
// off `useGetAdminSessionsQuery`), leaving the screen's own week-nav logic
// under test.

// ---- Mocks (must come before importing the screen) -------------------------

jest.mock('../../../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 't',
    AUTH0_DOMAIN: 't',
    AUTH0_AUDIENCE: 't',
    API_URL: 'http://test.local',
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  // The screen registers a focus-refetch; a no-op keeps it inert in tests.
  useFocusEffect: jest.fn(),
}));

// RTK Query hooks. `useGetAdminSessionsQuery` captures every call's args so we
// can assert the query window shifts with the week offset. The rest are inert
// stubs (lazy query + four mutations) shaped like their real return values.
const mockUseGetAdminSessionsQuery: jest.Mock<any, any> = jest.fn(() => ({
  data: { sessions: [] },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
}));
// Stubs live INSIDE the factory: jest hoists jest.mock above imports and
// forbids the factory from referencing out-of-scope vars not prefixed `mock`.
jest.mock('../../../features/api/apiSlice', () => {
  const lazyStub = [
    jest.fn(() => ({ unwrap: () => Promise.resolve({ session: { bookings: [] } }) })),
    { isLoading: false },
  ];
  const mutationStub = [
    jest.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ];
  return {
    useGetAdminSessionsQuery: (...a: any[]) => mockUseGetAdminSessionsQuery(...a),
    useLazyGetAdminSessionDetailsQuery: () => lazyStub,
    useCreateAdminSessionMutation: () => mutationStub,
    useUpdateAdminSessionMutation: () => mutationStub,
    useCancelAdminSessionMutation: () => mutationStub,
    useDeleteAdminBookingMutation: () => mutationStub,
  };
});

// Child components: render nothing so their own hook graphs don't load.
jest.mock('../components/AdminScheduleHeader', () => ({ AdminScheduleHeader: () => null }));
jest.mock('../components/EditBookingModal', () => ({ EditBookingModal: () => null }));
jest.mock('../components/AddBookingModal', () => ({ AddBookingModal: () => null }));
jest.mock('../components/EditSessionModal', () => ({ EditSessionModal: () => null }));
jest.mock('../components/ConfirmCancelSessionModal', () => ({ ConfirmCancelSessionModal: () => null }));
jest.mock('../components/ConfirmDeleteBookingModal', () => ({ ConfirmDeleteBookingModal: () => null }));
jest.mock('../components/AddSessionModal', () => ({ AddSessionModal: () => null }));
jest.mock('../../../components/schedule/WeekDayTabs', () => ({ WeekDayTabs: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// reanimated may be pulled in transitively. Stable JS shim.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// ---- Imports (after mocks) -------------------------------------------------

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdminScheduleScreen } from '../AdminScheduleScreen';
import { getStartOfWeek } from '../../../utils/dates';

const renderAdminSchedule = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AdminScheduleScreen />
    </SafeAreaProvider>
  );

// Pull the `{ from, to }` arg from the most recent useGetAdminSessionsQuery call.
function lastQueryWindow(): { from: string; to: string } {
  const calls = mockUseGetAdminSessionsQuery.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const arg = calls[calls.length - 1][0];
  expect(arg).toBeTruthy();
  return arg as { from: string; to: string };
}

// The admin screen's exact window shape for a given week offset:
//   start = current-week start + 7*offset days
//   end   = start + 6 days @ 23:59:59.999 (local)
function expectedWindow(offset: number): { from: string; to: string } {
  const base = getStartOfWeek(new Date(), 0);
  const start = new Date(base);
  start.setDate(base.getDate() + 7 * offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

const PREV_WEEK_LABEL = 'الأسبوع السابق';
const NEXT_WEEK_LABEL = 'الأسبوع التالي';
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  mockUseGetAdminSessionsQuery.mockClear();
  mockNavigation.navigate.mockReset();
  mockNavigation.goBack.mockReset();
});

describe('ADMIN-SCHED-NAV — Admin schedule week navigation', () => {
  test('initial render queries the CURRENT week window (offset 0)', () => {
    renderAdminSchedule();
    const { from, to } = lastQueryWindow();
    const exp = expectedWindow(0);
    expect(from).toBe(exp.from);
    expect(to).toBe(exp.to);
  });

  test('both the previous- and next-week controls are present on the current week (admin navigates both directions)', () => {
    renderAdminSchedule();
    expect(screen.getByLabelText(PREV_WEEK_LABEL)).toBeTruthy();
    expect(screen.getByLabelText(NEXT_WEEK_LABEL)).toBeTruthy();
  });

  test('pressing "next week" shifts the query window +7 days', () => {
    renderAdminSchedule();
    const before = lastQueryWindow();
    mockUseGetAdminSessionsQuery.mockClear();

    fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));

    const after = lastQueryWindow();
    expect(Math.round((new Date(after.from).getTime() - new Date(before.from).getTime()) / DAY_MS)).toBe(7);
    expect(Math.round((new Date(after.to).getTime() - new Date(before.to).getTime()) / DAY_MS)).toBe(7);

    const exp = expectedWindow(1);
    expect(after.from).toBe(exp.from);
    expect(after.to).toBe(exp.to);
  });

  test('pressing "previous week" from the current week shifts the query window -7 days (the new admin capability: past weeks)', () => {
    renderAdminSchedule();
    const before = lastQueryWindow();
    mockUseGetAdminSessionsQuery.mockClear();

    fireEvent.press(screen.getByLabelText(PREV_WEEK_LABEL));

    const after = lastQueryWindow();
    expect(Math.round((new Date(after.from).getTime() - new Date(before.from).getTime()) / DAY_MS)).toBe(-7);
    expect(Math.round((new Date(after.to).getTime() - new Date(before.to).getTime()) / DAY_MS)).toBe(-7);

    const exp = expectedWindow(-1);
    expect(after.from).toBe(exp.from);
    expect(after.to).toBe(exp.to);
  });

  test('next then previous returns to the current-week window (round trip)', () => {
    renderAdminSchedule();

    fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));
    fireEvent.press(screen.getByLabelText(PREV_WEEK_LABEL));

    const after = lastQueryWindow();
    const exp = expectedWindow(0);
    expect(after.from).toBe(exp.from);
    expect(after.to).toBe(exp.to);
  });
});

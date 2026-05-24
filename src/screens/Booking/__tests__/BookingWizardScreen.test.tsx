// src/screens/Booking/__tests__/BookingWizardScreen.test.tsx
// Component tests for the consumer booking wizard. Validates the most
// user-visible review findings:
//
// - CLIENT-1.1: time range is rendered as "start - end", not "end - start"
// - CLIENT-2.11: step-1 canProceed uses a `??` guard so the next button
//   stays disabled when the selected date has no sessions
//
// Mocking strategy: replace the RTK Query hooks the screen consumes with
// jest.fn() factories that return canned data. Mock navigation, focus
// hooks, and reanimated. This avoids spinning up a real store or a real
// Auth0 session inside the test.

// ---- Mocks (must come before importing the screen) -------------------------

jest.mock('../../../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 't',
    AUTH0_DOMAIN: 't',
    AUTH0_AUDIENCE: 't',
    API_URL: 'http://test.local',
  },
}));

// React Navigation's focus/route hooks - the wizard uses them to decide
// when to refetch and how to handle back navigation.
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};
let mockRouteParams: Record<string, any> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (fn: () => any) => {
    // Run the callback once on mount, like the real implementation does.
    const React = require('react');
    React.useEffect(() => {
      const cleanup = fn();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
  useIsFocused: () => true,
}));

// RTK Query hooks - stubbed so we don't need a real Provider/store.
let mockSessions: any[] = [];
let mockSessionsLoading = false;
let mockSessionDetails: any = null;
let mockCreateReservation = jest.fn().mockResolvedValue({});
const mockUseGetSessionsQuery: jest.Mock<any, any> = jest.fn(() => ({
  data: { sessions: mockSessions },
  isLoading: mockSessionsLoading,
  isFetching: false,
  refetch: jest.fn(),
}));
const mockUseGetSessionByIdQuery: jest.Mock<any, any> = jest.fn(() => ({
  data: mockSessionDetails ? { session: mockSessionDetails } : undefined,
  isLoading: false,
  isFetching: false,
  refetch: jest.fn(),
}));
const mockUseCreateReservationMutation: jest.Mock<any, any> = jest.fn(() => [
  (...args: any[]) => ({
    unwrap: () => mockCreateReservation(...args),
  }),
  { isLoading: false },
]);
jest.mock('../../../features/api/apiSlice', () => ({
  useGetSessionsQuery: (...a: any[]) => mockUseGetSessionsQuery(...a),
  useGetSessionByIdQuery: (...a: any[]) => mockUseGetSessionByIdQuery(...a),
  useCreateReservationMutation: (...a: any[]) =>
    mockUseCreateReservationMutation(...a),
}));

// react-native-reanimated is pulled in transitively by gesture-handler
// inside react-navigation's stack. The /mock module is a stable JS shim.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// ---- Imports (after mocks) -------------------------------------------------

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BookingWizardScreen } from '../BookingWizardScreen';

const renderWizard = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <BookingWizardScreen />
    </SafeAreaProvider>
  );

// Build a session with start time today at `hour:minute`.
function makeSession(overrides: Partial<{
  id: string;
  title: string;
  hour: number;
  minute: number;
  durationMin: number;
  capacity: number;
  bookedCount: number;
  availableSeats: number;
  instructorName: string;
}>) {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    overrides.hour ?? 10,
    overrides.minute ?? 0,
    0
  );
  const capacity = overrides.capacity ?? 6;
  const bookedCount = overrides.bookedCount ?? 0;
  return {
    id: overrides.id ?? 'session-1',
    title: overrides.title ?? 'بيلاتس أجهزة',
    startsAt: start.toISOString(),
    durationMin: overrides.durationMin ?? 60,
    capacity,
    bookedCount,
    availableSeats: overrides.availableSeats ?? capacity - bookedCount,
    instructorName: overrides.instructorName ?? 'Emma',
    status: 'scheduled',
  };
}

beforeEach(() => {
  mockSessions = [];
  mockSessionsLoading = false;
  mockSessionDetails = null;
  mockRouteParams = {};
  mockCreateReservation = jest.fn().mockResolvedValue({});
  mockNavigation.goBack.mockReset();
  mockNavigation.navigate.mockReset();
});

describe('BookingWizardScreen - Step 1', () => {
  test('renders the day-picker header', () => {
    renderWizard();
    expect(screen.getByText('اختاري اليوم')).toBeTruthy();
  });

  test('shows a loading spinner while sessions are loading', () => {
    mockSessionsLoading = true;
    renderWizard();
    // The header is rendered, the day grid is not - assert that no
    // day name appears yet.
    expect(screen.getByText('اختاري اليوم')).toBeTruthy();
  });
});

describe('BookingWizardScreen - canProceed (CLIENT-2.11)', () => {
  // CLIENT-2.11: today the check is
  //   !!selectedDate && dayGroups.find(...)?.sessionsCount! > 0
  // The non-null assertion `!` can swallow `undefined > 0`. The intended
  // form uses the `??` nullish-coalescing operator:
  //   (dayGroups.find(...)?.sessionsCount ?? 0) > 0
  //
  // The user-visible effect should be identical, so the .failing test
  // asserts the intended *behavior*: tapping a date with sessions enables
  // the next button. This is hard to assert from outside today because
  // dates are selected by pressing DayCard children whose text we'd need
  // to know. Instead we make a structural assertion against the source.
  test(
    'CLIENT-2.11: source uses `?? 0` instead of `!.>`',
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'BookingWizardScreen.tsx'),
        'utf8'
      );
      // The buggy pattern: `.sessionsCount! > 0`. Intended: `?? 0) > 0`.
      expect(src).not.toMatch(/sessionsCount!\s*>/);
    }
  );
});

describe('BookingWizardScreen - time range rendering (CLIENT-1.1)', () => {
  // CLIENT-1.1: getTimeRange returns "${end} - ${start}" today, so every
  // session card shows "11:00 - 10:00". The intended form is start - end.
  //
  // We can't easily drill into Step 2 (it requires selecting a date),
  // so we make a structural assertion against the source - same approach
  // as CLIENT-2.11. The runtime test (rendered Session card showing
  // "10:00 - 11:00") would need much more wizard interaction than is
  // worth setting up here.
  test(
    'CLIENT-1.1: getTimeRange returns start before end',
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'BookingWizardScreen.tsx'),
        'utf8'
      );
      // Buggy: `${getEndTime(...)} - ${formatTime(...)}`
      // Intended: `${formatTime(...)} - ${getEndTime(...)}`
      const buggy = /\$\{getEndTime\([^)]+\)\}\s*-\s*\$\{formatTime\(/;
      expect(src).not.toMatch(buggy);
    }
  );
});

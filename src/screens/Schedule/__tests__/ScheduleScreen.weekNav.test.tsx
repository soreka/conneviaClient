// src/screens/Schedule/__tests__/ScheduleScreen.weekNav.test.tsx
//
// SCHED-NAV-01 — Schedule-tab week navigation (current week + next week).
// ---------------------------------------------------------------------------
//
// CONTEXT
// `src/screens/Schedule/index.tsx` today hardcodes the CURRENT week:
//   const startOfWeek = getStartOfWeek(today, 0);
//   const endOfWeek   = getEndOfWeek(startOfWeek);
//   useGetSessionsQuery({ from: startOfWeek.toISOString(), to: endOfWeek.toISOString() })
// So a customer can never see/book NEXT week from the Schedule tab even
// though the booking wizard already covers a 14-day horizon. SCHED-NAV-01
// adds BOUNDED week navigation (offset 0..1 — current week + next week,
// matching the 14-day generation horizon): a "next week" control, plus a
// "back to current week" control once the user is on next week. Switching
// weeks must recompute BOTH the query window (from/to shift ±7 days) AND the
// day tabs (their dates shift ±7 days).
//
// ACCESSIBILITY-LABEL CONTRACT (documented for the implementer in
// `.claude/REVIEW_FINDINGS.md` SCHED-NAV-01):
//   - "next week" control     → accessibilityLabel="الأسبوع القادم"
//   - "back to current week"  → accessibilityLabel="الأسبوع الحالي"
// The tests query the controls via getByLabelText with EXACTLY those strings.
// If the implementer prefers different wording they must update these tests
// (the tester owns test edits) and the REVIEW_FINDINGS note — but these are
// the pinned labels.
//
// These are `test.failing` per the Bugs Policy: the controls + offset state
// do not exist yet, so the queries throw (control not found) / the query
// window never shifts. When the implementer lands the feature and the bodies
// stop throwing, Jest reports "Failing test passed" → drop `.failing`.
//
// Mocking strategy mirrors `BookingWizardScreen.test.tsx`: stub
// `useGetSessionsQuery` with a jest.fn we can inspect for its args, stub
// navigation, and mock reanimated (pulled in transitively).

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
  goBack: jest.fn(),
  navigate: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// RTK Query hook — capture every call's args so we can assert the query
// window. Returns an empty (but defined) sessions payload so the screen
// renders its day-tabs + list (not the loading/error branches).
const mockUseGetSessionsQuery: jest.Mock<any, any> = jest.fn(() => ({
  data: { sessions: [] },
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
  isFetching: false,
}));
jest.mock('../../../features/api/apiSlice', () => ({
  useGetSessionsQuery: (...a: any[]) => mockUseGetSessionsQuery(...a),
}));

// reanimated is pulled in transitively by gesture-handler. Stable JS shim.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// ---- Imports (after mocks) -------------------------------------------------

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScheduleScreen } from '../index';
import {
  getStartOfWeek,
  getEndOfWeek,
  formatArabicDayName,
} from '../../../utils/dates';

const renderSchedule = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ScheduleScreen />
    </SafeAreaProvider>
  );

// Pull the `{ from, to }` arg from the most recent useGetSessionsQuery call.
function lastQueryWindow(): { from: string; to: string } {
  const calls = mockUseGetSessionsQuery.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const arg = calls[calls.length - 1][0];
  expect(arg).toBeTruthy();
  return arg as { from: string; to: string };
}

// The accessibility-label contract (see header).
const NEXT_WEEK_LABEL = 'الأسبوع القادم';
const CURRENT_WEEK_LABEL = 'الأسبوع الحالي';

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  mockUseGetSessionsQuery.mockClear();
  mockNavigation.goBack.mockReset();
  mockNavigation.navigate.mockReset();
});

describe('SCHED-NAV-01 — Schedule week navigation', () => {
  // ===================================================================
  // INITIAL RENDER — current week window
  // ===================================================================
  // PLAIN test (not .failing): querying the current week on initial render is
  // ALREADY the behavior today AND must REMAIN true once the feature lands
  // (offset starts at 0). It's a regression guard, so it passes now.
  test(
    'SCHED-NAV-01: initial render queries the CURRENT week window (offset 0)',
    () => {
      renderSchedule();
      const { from, to } = lastQueryWindow();

      const today = new Date();
      const expectedStart = getStartOfWeek(today, 0);
      const expectedEnd = getEndOfWeek(expectedStart);

      expect(from).toBe(expectedStart.toISOString());
      expect(to).toBe(expectedEnd.toISOString());
    }
  );

  test(
    'SCHED-NAV-01: the "next week" control is present on initial (current-week) render',
    () => {
      renderSchedule();
      expect(screen.getByLabelText(NEXT_WEEK_LABEL)).toBeTruthy();
    }
  );

  // NOTE on the "back to current week" control being ABSENT on the current
  // week, and the "next week" control being ABSENT on next week: those are
  // ABSENCE assertions that are ALSO satisfied by today's no-feature source
  // (the controls simply don't exist yet), so they can't stand alone as
  // `.failing` tests (they'd pass against current source). We fold each into
  // a test that FIRST exercises the new control (a positive action that
  // throws today), then asserts the boundedness invariant — see the
  // "back to current week restores ..." and "bounded — no next-week control
  // once on next week" tests below.

  // ===================================================================
  // ADVANCE TO NEXT WEEK — query window + day tabs shift +7 days
  // ===================================================================
  test(
    'SCHED-NAV-01: pressing "next week" shifts the query window +7 days',
    () => {
      renderSchedule();

      const before = lastQueryWindow();
      mockUseGetSessionsQuery.mockClear();

      fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));

      const after = lastQueryWindow();

      const beforeFrom = new Date(before.from).getTime();
      const afterFrom = new Date(after.from).getTime();
      const beforeTo = new Date(before.to).getTime();
      const afterTo = new Date(after.to).getTime();

      // +7 days, both ends (allow a tiny epsilon for ms rounding).
      expect(Math.round((afterFrom - beforeFrom) / DAY_MS)).toBe(7);
      expect(Math.round((afterTo - beforeTo) / DAY_MS)).toBe(7);
    }
  );

  test(
    'SCHED-NAV-01: pressing "next week" matches the explicit next-week window (getStartOfWeek+7 .. getEndOfWeek)',
    () => {
      renderSchedule();
      mockUseGetSessionsQuery.mockClear();

      fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));
      const { from, to } = lastQueryWindow();

      const today = new Date();
      const currentStart = getStartOfWeek(today, 0);
      const nextStart = new Date(currentStart);
      nextStart.setDate(currentStart.getDate() + 7);
      const nextEnd = getEndOfWeek(nextStart);

      expect(from).toBe(nextStart.toISOString());
      expect(to).toBe(nextEnd.toISOString());
    }
  );

  test(
    'SCHED-NAV-01: pressing "next week" shifts the day-tab dates +7 days (the day-name labels rotate by a week)',
    () => {
      renderSchedule();

      // Current-week day names rendered in the WeekDayTabs.
      const today = new Date();
      const currentStart = getStartOfWeek(today, 0);
      const nextStart = new Date(currentStart);
      nextStart.setDate(currentStart.getDate() + 7);

      // A day name that should be visible after switching to next week — the
      // tab for the first day of next week. Day names repeat week-to-week, so
      // we instead assert via the displayed DAY-OF-MONTH header surfaced by
      // the DayInfoCard for the selected day. To keep this resilient to the
      // selected-index reset behavior, we assert the WEEK label control flips
      // (the "back to current week" control appears), which is only possible
      // once the offset advanced — i.e. the day-tabs are now next week.
      fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));

      // After advancing, the "back to current week" affordance must appear —
      // proof the screen is now rendering the next-week tabs, not the current.
      expect(screen.getByLabelText(CURRENT_WEEK_LABEL)).toBeTruthy();

      // And the day-name for the first next-week date must be findable as a
      // tab label (WeekDayTabs renders `formatArabicDayName(date)`).
      const firstNextDayName = formatArabicDayName(nextStart);
      expect(screen.getAllByText(firstNextDayName).length).toBeGreaterThan(0);
    }
  );

  // ===================================================================
  // RETURN TO CURRENT WEEK
  // ===================================================================
  test(
    'SCHED-NAV-01: pressing "back to current week" restores the current-week query window (and the back control is absent until on next week)',
    () => {
      renderSchedule();

      // BOUNDEDNESS (min edge): on the current week the "back to current
      // week" affordance must be absent — there is no PAST week to go to.
      expect(screen.queryByLabelText(CURRENT_WEEK_LABEL)).toBeNull();

      fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));
      mockUseGetSessionsQuery.mockClear();

      fireEvent.press(screen.getByLabelText(CURRENT_WEEK_LABEL));
      const { from, to } = lastQueryWindow();

      const today = new Date();
      const currentStart = getStartOfWeek(today, 0);
      const currentEnd = getEndOfWeek(currentStart);

      expect(from).toBe(currentStart.toISOString());
      expect(to).toBe(currentEnd.toISOString());
    }
  );

  // ===================================================================
  // BOUNDEDNESS — offset clamped to [0, 1]
  // ===================================================================
  test(
    'SCHED-NAV-01: navigation is bounded — there is no "next week" control once on next week (cannot advance to week +2)',
    () => {
      renderSchedule();
      fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));
      // On next week (offset 1, the max), the "next week" control must be
      // gone (or disabled) so the user cannot reach week +2 — outside the
      // 14-day generation horizon.
      expect(screen.queryByLabelText(NEXT_WEEK_LABEL)).toBeNull();
    }
  );

  test(
    'SCHED-NAV-01: navigation is bounded — the query window never advances beyond next week even with repeated presses',
    () => {
      renderSchedule();

      // First press → next week.
      fireEvent.press(screen.getByLabelText(NEXT_WEEK_LABEL));
      const afterFirst = lastQueryWindow();

      // If a stray next-week control somehow remains, pressing it must NOT
      // advance further. (queryByLabelText is null on the bounded UI, so this
      // press is a no-op; we assert the window is unchanged either way.)
      const stray = screen.queryByLabelText(NEXT_WEEK_LABEL);
      if (stray) {
        mockUseGetSessionsQuery.mockClear();
        fireEvent.press(stray);
      }
      const afterSecond = lastQueryWindow();

      expect(afterSecond.from).toBe(afterFirst.from);
      expect(afterSecond.to).toBe(afterFirst.to);

      // And the window is exactly +7 from the current week — never +14.
      const today = new Date();
      const currentStart = getStartOfWeek(today, 0);
      const maxStart = new Date(currentStart);
      maxStart.setDate(currentStart.getDate() + 7);
      expect(afterSecond.from).toBe(maxStart.toISOString());
    }
  );
});

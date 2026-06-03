// src/screens/Subscription/__tests__/SubscriptionScreen.progressGuards.test.tsx
//
// Failing regression tests for the divide-by-zero / NaN-width bugs in the
// customer Subscription screen.
//
// Findings covered:
//   - C-NET-05 / C-UX-10 — monthly progress-bar width is computed as
//     `(monthlyUsed / monthlyLimit) * 100` with no `monthlyLimit > 0` guard
//     (SubscriptionScreen.tsx:287). When monthlyLimit is 0 (or undefined,
//     coerced to NaN), Math.min(100, NaN) is NaN -> the rendered CSS value
//     becomes the invalid string 'NaN%'.
//   - C-NET-05 / C-UX-10 — weekly progress-bar width has the same defect
//     (SubscriptionScreen.tsx:306).
//
// INTENDED CONTRACT: any progress-bar width computed from `used / limit`
// must guard a 0 (or undefined) denominator and resolve to 0% (or 0), NOT
// 'NaN%' / NaN. The Dashboard's UsageCard already follows this pattern.
//
// Each test is a `test.failing(...)`: the body asserts the intended (safe)
// behavior, so it FAILS against the current buggy code and will start
// PASSING once the implementer adds the `limit > 0 ? ... : 0` guard.

// ---- Mocks (must come before importing the screen) -------------------------

jest.mock('../../../config/env', () => ({
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

// Reanimated v4 ships a JS-only mock for tests; SubscriptionScreen renders
// AnimatedCard which uses useSharedValue / withTiming / withDelay.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// Navigation hooks
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useFocusEffect: (fn: () => any) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = fn();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
  useIsFocused: () => true,
}));

// RTK Query hooks consumed by SubscriptionScreen
let mockSubscriptionData: any = null;
let mockUsageData: any = null;
jest.mock('../../../features/api/apiSlice', () => ({
  useGetMySubscriptionQuery: () => ({
    data: mockSubscriptionData,
    isLoading: false,
    isFetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
  }),
  useGetMySubscriptionUsageQuery: () => ({
    data: mockUsageData,
    isLoading: false,
    isFetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
  }),
}));

// ---- Imports (after mocks) -------------------------------------------------

import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SubscriptionScreen } from '../SubscriptionScreen';

const renderSubscription = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <SubscriptionScreen />
    </SafeAreaProvider>
  );

/**
 * Walk the rendered JSON tree and collect every `style.width` value found
 * on any node. Style can be a single object, an array, or undefined.
 * Returns the list of width strings/numbers in source order.
 */
function collectStyleWidths(node: any): Array<string | number> {
  const widths: Array<string | number> = [];
  const visit = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    const styleProp = n.props?.style;
    const flat = Array.isArray(styleProp) ? styleProp : styleProp ? [styleProp] : [];
    for (const s of flat) {
      if (s && typeof s === 'object' && 'width' in s) {
        widths.push((s as any).width);
      }
    }
    if (n.children) visit(n.children);
  };
  visit(node);
  return widths;
}

beforeEach(() => {
  mockSubscriptionData = {
    current: {
      id: 'sub-1',
      status: 'active',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
      plan: { name: 'باقة', monthlyLimit: 8, price: 25000 },
    },
    next: null,
    pending: null,
  };
  mockUsageData = {
    usage: {
      monthlyUsed: 2,
      monthlyLimit: 8,
      monthlyLeft: 6,
      weeklyUsed: 1,
      weeklyLimit: 3,
      weeklyLeft: 2,
      lifetime: 12,
    },
  };
});

describe('SubscriptionScreen - C-NET-05 / C-UX-10: progress-bar width zero-guard', () => {
  test(
    'C-NET-05/C-UX-10: monthlyLimit=0 yields a 0% (not NaN%) monthly bar width',
    () => {
      // Edge state: a malformed plan / cleared limit. The buggy code does
      // (monthlyUsed / 0) * 100 -> Infinity, Math.min(100, Infinity) -> 100
      // (so this path currently happens to look full, not NaN). The truly
      // broken path is when monthlyUsed is also 0: 0/0 = NaN.
      mockUsageData = {
        usage: {
          monthlyUsed: 0,
          monthlyLimit: 0,
          monthlyLeft: 0,
          weeklyUsed: 0,
          weeklyLimit: 3,
          weeklyLeft: 3,
          lifetime: 0,
        },
      };

      const { toJSON } = renderSubscription();
      const widths = collectStyleWidths(toJSON());

      // No rendered element should carry an invalid CSS width.
      for (const w of widths) {
        expect(String(w)).not.toBe('NaN%');
        expect(typeof w === 'number' ? Number.isNaN(w) : false).toBe(false);
      }

      // At least one width should be the safe-guarded '0%' for the monthly
      // progress bar. (The bar's parent View is always rendered when usage
      // is present and current.status === 'active', so the inner bar exists
      // and its width should be 0%.)
      expect(widths.map(String)).toContain('0%');
    }
  );

  test(
    'C-NET-05/C-UX-10: weeklyLimit=0 yields a 0% (not NaN%) weekly bar width',
    () => {
      mockUsageData = {
        usage: {
          monthlyUsed: 0,
          monthlyLimit: 8,
          monthlyLeft: 8,
          weeklyUsed: 0,
          weeklyLimit: 0,
          weeklyLeft: 0,
          lifetime: 0,
        },
      };

      const { toJSON } = renderSubscription();
      const widths = collectStyleWidths(toJSON());

      for (const w of widths) {
        expect(String(w)).not.toBe('NaN%');
        expect(typeof w === 'number' ? Number.isNaN(w) : false).toBe(false);
      }
    }
  );

  test(
    'C-NET-05/C-UX-10: monthlyLimit=undefined yields a 0% (not NaN%) monthly bar width',
    () => {
      // Server edge case: the usage payload comes back with monthlyLimit
      // missing entirely. JS: anything / undefined -> NaN.
      mockUsageData = {
        usage: {
          monthlyUsed: 2,
          // monthlyLimit intentionally omitted (typed as `number` but the
          // real wire can omit fields on edge states).
          monthlyLeft: 0,
          weeklyUsed: 1,
          weeklyLimit: 3,
          weeklyLeft: 2,
          lifetime: 5,
        },
      };

      const { toJSON } = renderSubscription();
      const widths = collectStyleWidths(toJSON());

      for (const w of widths) {
        expect(String(w)).not.toBe('NaN%');
        expect(typeof w === 'number' ? Number.isNaN(w) : false).toBe(false);
      }
    }
  );

  test(
    'C-NET-05/C-UX-10: source guards monthly division with `monthlyLimit > 0`',
    () => {
      // Defensive structural guard. Even if a future refactor swaps the
      // Math.min call shape, the `limit > 0` (or equivalent zero-guard)
      // check must be present in the math. Mirrors the safe pattern in
      // screens/Dashboard/components/UsageCard.tsx and
      // screens/Subscription/components/WeeklyUsageCard.tsx (`weeklyLimit > 0
      // ? ... : 0`).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'SubscriptionScreen.tsx'),
        'utf8'
      );

      // Buggy current form: `(usage.monthlyUsed / usage.monthlyLimit) * 100`
      // wrapped in Math.min with NO ternary / guard. The intended form
      // either inlines a `usage.monthlyLimit > 0 ? ... : 0` ternary or
      // delegates to a safe helper (e.g. getUsagePercent / ProgressBar)
      // that performs the guard internally.
      const buggyMonthly =
        /Math\.min\(100,\s*\(usage\.monthlyUsed\s*\/\s*usage\.monthlyLimit\)\s*\*\s*100\)/;
      expect(src).not.toMatch(buggyMonthly);
    }
  );

  test(
    'C-NET-05/C-UX-10: source guards weekly division with `weeklyLimit > 0`',
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'SubscriptionScreen.tsx'),
        'utf8'
      );

      const buggyWeekly =
        /Math\.min\(100,\s*\(usage\.weeklyUsed\s*\/\s*usage\.weeklyLimit\)\s*\*\s*100\)/;
      expect(src).not.toMatch(buggyWeekly);
    }
  );
});

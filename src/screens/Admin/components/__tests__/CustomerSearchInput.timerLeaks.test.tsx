// src/screens/Admin/components/__tests__/CustomerSearchInput.timerLeaks.test.tsx
//
// Bugs-Policy regression guards for the admin-screen robustness polish:
//
//   C-STATE-04 — CustomerSearchInput has TWO uncleaned timers:
//     (1) `debounceRef` holds a 300ms search-debounce timeout (line ~68)
//         but there is NO useEffect cleanup that clears it on unmount.
//     (2) `handleBlur` calls a RAW `setTimeout(..., 200)` (line ~96) NOT
//         stored in any ref, so it can never be cancelled. If the component
//         unmounts within the blur window (e.g. AddBookingModal closes
//         right after selecting a customer), both timers fire setState on
//         an unmounted component.
//
// Source: connevia/.claude/PRESHIP_AUDIT_2026-06-03.md (C-STATE-04).
// Buggy spots in CustomerSearchInput.tsx:
//   - line ~36: `const debounceRef = useRef<NodeJS.Timeout | null>(null);`
//   - lines ~57-72: `handleQueryChange` schedules debounceRef.current, no cleanup
//   - lines ~91-97: `handleBlur` raw setTimeout, no ref, no cleanup
//
// INTENDED CONTRACT (per the brief):
//   Add a `blurRef = useRef<NodeJS.Timeout | null>(null)` so the blur timer
//   can be cancelled, store the blur setTimeout into blurRef.current, and
//   add a `useEffect(() => () => { clearTimeout(debounceRef.current);
//   clearTimeout(blurRef.current); }, [])` so both fire-and-forget timers
//   are cancelled on unmount.
//
// Test strategy: BEHAVIORAL with jest fake timers + render + unmount,
// matching the brief. We assert (a) the RTK lazy trigger is never called
// AFTER unmount and (b) clearTimeout is called during teardown. A
// SOURCE-REGEX backstop pins the blurRef + cleanup-effect shape.
//
// Status: FIXED 2026-06-03 — the cleanup effect + blur ref now exist in
// CustomerSearchInput.tsx and the behavioral + source-regex guards below
// hold. Tests are kept as durable regression guards (no `.failing`).

// ---- Mocks (must come before importing the component) ----------------------

jest.mock('../../../../config/env', () => ({
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

// RTK Query lazy trigger. The component reads
//   const [triggerSearch, { data, isLoading, isFetching, error }] =
//     useLazyAdminSearchCustomersQuery();
// We expose `mockTriggerSearch` as the lazy trigger so the behavioral
// assertions can ask "was the search ever fired after unmount?".
const mockTriggerSearch = jest.fn((..._args: unknown[]) => undefined);
const mockUseLazyAdminSearchCustomersQuery = jest.fn(
  (..._args: unknown[]) =>
    [
      mockTriggerSearch,
      { data: undefined, isLoading: false, isFetching: false, error: null },
    ] as const
);
jest.mock('../../../../features/api/apiSlice', () => ({
  useLazyAdminSearchCustomersQuery: (...a: unknown[]) =>
    mockUseLazyAdminSearchCustomersQuery(...a),
}));

// ---- Imports (after mocks) -------------------------------------------------

import { render, fireEvent } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';

import { CustomerSearchInput } from '../CustomerSearchInput';

const SRC_PATH = path.join(__dirname, '..', 'CustomerSearchInput.tsx');
const readSrc = (): string => fs.readFileSync(SRC_PATH, 'utf8');

beforeEach(() => {
  mockTriggerSearch.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CustomerSearchInput — C-STATE-04: debounce + blur timer leaks on unmount', () => {
  test(
    'C-STATE-04: pending 300ms debounce timer is cleared on unmount (trigger never fires post-unmount)',
    () => {
      const onSelect = jest.fn();
      const utils = render(
        <CustomerSearchInput onSelectCustomer={onSelect} />
      );

      // Type a query; this schedules a 300ms debounce timer that, when it
      // fires, calls `triggerSearch({ q: text, limit: 15 })`.
      const input = utils.getByPlaceholderText('ابحثي عن عميلة...');
      const SENTINEL = 'SaraUniqueDebounceToken';
      fireEvent.changeText(input, SENTINEL);

      // Pre-unmount: trigger has NOT been called yet (debounce hasn't fired).
      const callsBefore = mockTriggerSearch.mock.calls.length;

      // Unmount BEFORE the 300ms debounce fires. Intended cleanup clears
      // debounceRef so the timer is cancelled.
      utils.unmount();

      // With cleanup wired: jest knows of NO pending timers post-unmount.
      // With the buggy current code: the 300ms timer is still pending here,
      // because nothing cleared it.
      expect(jest.getTimerCount()).toBe(0);

      // Run any leftover timers (a no-op under the intended fix). Then
      // assert the lazy trigger was NEVER called with the sentinel — i.e.
      // the orphaned debounce fire never happened.
      jest.runOnlyPendingTimers();

      const calledWithSentinel = mockTriggerSearch.mock.calls.some(
        (call) =>
          (call[0] as { q?: string } | undefined)?.q === SENTINEL
      );
      expect(calledWithSentinel).toBe(false);

      // Sanity: log the pre-unmount count so jest output shows the realistic
      // setup (no calls were made pre-unmount either).
      expect(callsBefore).toBe(0);
    }
  );

  test(
    'C-STATE-04: pending 200ms blur timer is cleared on unmount (raw setTimeout in handleBlur must move into a ref)',
    () => {
      const onSelect = jest.fn();
      const utils = render(
        <CustomerSearchInput onSelectCustomer={onSelect} />
      );

      const input = utils.getByPlaceholderText('ابحثي عن عميلة...');

      // Focus then blur the input — handleBlur schedules a raw 200ms
      // setTimeout that calls setIsFocused(false) + setShowDropdown(false).
      // Today this timer is NOT stored in any ref and can NEVER be cancelled.
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');

      // Unmount BEFORE the 200ms blur window elapses. Intended behavior:
      // the cleanup effect clears `blurRef.current` so the timer never fires.
      utils.unmount();

      // With cleanup wired (and the blur timer stored in blurRef so it can
      // be cleared), jest should know of NO pending timers after unmount.
      // Today there is at least one pending fire-and-forget blur timer.
      expect(jest.getTimerCount()).toBe(0);

      // Defensive: advance time to drain any leftovers under the buggy code;
      // this would otherwise attempt setState on the unmounted component.
      jest.runOnlyPendingTimers();
    }
  );

  test(
    'C-STATE-04: unmount calls clearTimeout for BOTH the debounce ref and the blur ref',
    () => {
      const onSelect = jest.fn();
      const clearSpy = jest.spyOn(global, 'clearTimeout');

      const utils = render(
        <CustomerSearchInput onSelectCustomer={onSelect} />
      );

      const input = utils.getByPlaceholderText('ابحثي عن عميلة...');

      // Type to arm the debounce timer.
      fireEvent.changeText(input, 'Sara');

      // Focus + blur to arm the blur timer.
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');

      const callsBeforeUnmount = clearSpy.mock.calls.length;

      utils.unmount();

      const callsAfterUnmount = clearSpy.mock.calls.length;

      // Intended contract: the cleanup effect runs `clearTimeout` for BOTH
      // refs (debounceRef + blurRef) -> AT LEAST TWO additional calls during
      // unmount. The buggy code has no cleanup effect at all -> delta of 0.
      // We allow >= 2 (an implementation that adds a defensive
      // `if (debounceRef.current) clearTimeout(debounceRef.current);`
      // still calls it exactly once per ref).
      expect(callsAfterUnmount - callsBeforeUnmount).toBeGreaterThanOrEqual(2);

      clearSpy.mockRestore();
    }
  );

  // SOURCE-REGEX backstops. The fix MUST introduce a blur-timer ref (so the
  // raw setTimeout in handleBlur can be cancelled) AND a useEffect cleanup
  // that clears both refs on unmount. We accept any conventional ref name
  // (e.g. blurRef, blurTimeoutRef, blurTimerRef).
  test(
    'C-STATE-04: source introduces a ref for the blur timer (so it can be cancelled)',
    () => {
      const src = readSrc();

      // The component must declare a useRef for the blur timer AND assign
      // the handleBlur setTimeout into it. Today there is no such ref.
      const hasBlurRef =
        /const\s+blur(?:Timeout|Timer)?Ref\s*=\s*useRef\s*<\s*(?:NodeJS\.Timeout|ReturnType<typeof setTimeout>)\s*\|\s*null\s*>\s*\(\s*null\s*\)/.test(
          src
        );

      // Blur timer must be stored into the ref (not a bare `setTimeout(...)`
      // floating in handleBlur).
      const blurStoredInRef =
        /blur(?:Timeout|Timer)?Ref\.current\s*=\s*setTimeout/.test(src);

      expect(hasBlurRef).toBe(true);
      expect(blurStoredInRef).toBe(true);
    }
  );

  test(
    'C-STATE-04: source contains a useEffect cleanup that clears BOTH timers on unmount',
    () => {
      const src = readSrc();

      // The cleanup effect must reference clearTimeout for BOTH the debounce
      // ref AND the (newly introduced) blur ref, with an empty dep array so
      // it runs only on unmount.
      const cleanupBlock =
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*[\s\S]*?clearTimeout\s*\(\s*debounceRef\.current[\s\S]*?clearTimeout\s*\(\s*blur(?:Timeout|Timer)?Ref\.current[\s\S]*?\[\s*\]\s*\)/m;
      const cleanupBlockReversed =
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*[\s\S]*?clearTimeout\s*\(\s*blur(?:Timeout|Timer)?Ref\.current[\s\S]*?clearTimeout\s*\(\s*debounceRef\.current[\s\S]*?\[\s*\]\s*\)/m;

      expect(cleanupBlock.test(src) || cleanupBlockReversed.test(src)).toBe(
        true
      );
    }
  );
});

// src/screens/Admin/__tests__/AdminCustomersScreen.timerLeaks.test.tsx
//
// Bugs-Policy regression guards for the admin-screen robustness polish:
//
//   C-STATE-03 — AdminCustomersScreen debounce setTimeout leaks on unmount.
//   `handleSearchChange` stores a 500ms debounce in `searchTimeoutRef` but
//   has NO useEffect cleanup that clears `searchTimeoutRef.current` on
//   unmount. If the admin types and navigates away within 500ms, the
//   pending timer fires `setDebouncedSearch(text)` on an unmounted
//   component — a setState-after-unmount and a slow leak as it accumulates
//   across navigations.
//
// Source: connevia/.claude/PRESHIP_AUDIT_2026-06-03.md (C-STATE-03).
// Buggy spot: AdminCustomersScreen.tsx ~lines 84-94 (timer set, no cleanup
// effect anywhere in the file).
//
// INTENDED CONTRACT (per the audit + brief):
//   Every debounce/blur `setTimeout` must be cleared in a `useEffect`
//   cleanup so no timer fires after unmount, e.g.
//     useEffect(() => () => {
//       if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
//     }, []);
//
// Test strategy: BEHAVIORAL with jest fake timers + render + unmount,
// matching the brief ("prefer behavioral; jest fake timers + unmount for the
// leak guards"). We assert that after unmount-before-debounce-fires, the
// downstream side-effect — the RTK Query hook being re-invoked with the
// typed `q` — DOES NOT happen. If the timer is properly cleared on unmount,
// `setDebouncedSearch` never runs, so the query is never re-invoked with
// the typed text.
//
// A SOURCE-REGEX backstop is also included to pin the cleanup-effect shape,
// matching the precedent in AdminScheduleScreen.polish.test.ts (admin
// screen-render infra is Phase 2.5; behavioral coverage here is best-effort
// but the source contract is the durable guarantee).
//
// Status: FIXED 2026-06-03 — the cleanup effect now exists in
// AdminCustomersScreen.tsx and the behavioral + source-regex guards below
// hold. Tests are kept as durable regression guards (no `.failing`).

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

jest.mock('expo-linear-gradient', () => {
  // Return a thin passthrough that just renders children. We do NOT wrap in
  // <View>: NativeWind's css-interop transforms RN primitives at the babel
  // level and the resulting reference (`_ReactNativeCSSInterop`) cannot be
  // resolved inside a hoisted jest.mock factory. Returning a Fragment with
  // children avoids the css-interop instrumentation entirely.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const R = require('react');
  return {
    LinearGradient: (props: any) =>
      R.createElement(R.Fragment, null, props && props.children),
  };
});

// Navigation hooks. `useFocusEffect` runs the callback under a React effect
// so the screen's "refetch on focus" code path stays inert here (the
// asyncGuardedRefetch already guards isFetching / debounce / isFocused).
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
  useFocusEffect: (fn: () => any) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = fn();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
}));

// RTK Query — we capture every call to `useAdminGetCustomersQuery` so the
// behavioral assertion can ask "was this hook ever re-invoked with the typed
// text after unmount?". If the cleanup is missing, the buggy code's pending
// 500ms timer fires `setDebouncedSearch(text)` AFTER unmount — but since the
// component is gone, that setState is silently dropped under React 19. The
// observable side-effect we CAN assert against is: with cleanup wired, the
// hook is never re-invoked AFTER unmount with the typed-but-debounced q.
// We additionally count rerenders BEFORE unmount to prove the typing took
// effect (i.e. the test setup is realistic).
const mockUseAdminGetCustomersQuery = jest.fn(
  (..._args: unknown[]) => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isFetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
  })
);
jest.mock('../../../features/api/apiSlice', () => ({
  useAdminGetCustomersQuery: (...a: unknown[]) =>
    mockUseAdminGetCustomersQuery(...a),
}));

// ---- Imports (after mocks) -------------------------------------------------

import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as fs from 'fs';
import * as path from 'path';

import { AdminCustomersScreen } from '../AdminCustomersScreen';

const renderScreen = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AdminCustomersScreen />
    </SafeAreaProvider>
  );

const SRC_PATH = path.join(__dirname, '..', 'AdminCustomersScreen.tsx');
const readSrc = (): string => fs.readFileSync(SRC_PATH, 'utf8');

beforeEach(() => {
  mockUseAdminGetCustomersQuery.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AdminCustomersScreen — C-STATE-03: debounce setTimeout leaks on unmount', () => {
  test(
    'C-STATE-03: pending debounce timer is cleared on unmount (clearTimeout called during teardown)',
    () => {
      // Spy on clearTimeout BEFORE rendering so we can attribute any
      // teardown-time call to the cleanup effect (not to the per-keystroke
      // "clear-previous-debounce" branch in handleSearchChange).
      const clearSpy = jest.spyOn(global, 'clearTimeout');

      const utils = renderScreen();

      // Type into the search field to schedule a 500ms debounce timer.
      const input = utils.getByPlaceholderText(
        'ابحثي بالاسم أو رقم الهاتف أو البريد'
      );
      fireEvent.changeText(input, 'Sara');

      // Sanity: at this point a timer should be pending. The next keystroke
      // would clear it via handleSearchChange's own branch (line 88-90),
      // and the cleanup effect (when added) would clear it on unmount.
      const callsBeforeUnmount = clearSpy.mock.calls.length;

      // Unmount BEFORE the 500ms debounce fires. Intended behavior: the
      // missing `useEffect(() => () => clearTimeout(searchTimeoutRef.current), [])`
      // will be called, calling clearTimeout one more time with the pending
      // timeout id.
      utils.unmount();

      const callsAfterUnmount = clearSpy.mock.calls.length;

      // Intended contract: cleanup ran -> at least one ADDITIONAL clearTimeout
      // call happened during teardown. Today (buggy) there is NO cleanup
      // effect, so this delta is 0 and the test fails — which is exactly
      // what we want under .failing semantics until the fix lands.
      expect(callsAfterUnmount - callsBeforeUnmount).toBeGreaterThanOrEqual(1);

      clearSpy.mockRestore();
    }
  );

  test(
    'C-STATE-03: setDebouncedSearch downstream (the query re-invocation with typed q) never fires after unmount',
    () => {
      // Spy on setTimeout / clearTimeout BEFORE rendering so we can attribute
      // each schedule/clear call. We MUST NOT assert on the global
      // jest.getTimerCount() — that counts ALL pending fake timers in the
      // process (React Native internals, RTK Query polling, safe-area
      // measurement hooks, etc.) and cannot legitimately reach 0 even when
      // the component's own debounce cleanup is correctly wired. Instead we
      // target the component's specific contract: the captured 500ms debounce
      // handle must be cleared during teardown.
      const setSpy = jest.spyOn(global, 'setTimeout');
      const clearSpy = jest.spyOn(global, 'clearTimeout');

      const utils = renderScreen();

      const input = utils.getByPlaceholderText(
        'ابحثي بالاسم أو رقم الهاتف أو البريد'
      );

      // Capture the set of `q` values the hook has been invoked with before
      // we type. The initial render passes q: undefined.
      const callsBeforeTyping = mockUseAdminGetCustomersQuery.mock.calls.length;

      // Reset the spies so we attribute only post-render scheduling to our
      // typing event. Internal mounts (RTK Query setup, etc.) may schedule
      // their own timers, but those are not the contract under test.
      setSpy.mockClear();
      clearSpy.mockClear();

      // Type, which schedules a 500ms debounce timer to call
      // setDebouncedSearch('SaraUniqueDebouncedToken').
      const SENTINEL = 'SaraUniqueDebouncedToken';
      fireEvent.changeText(input, SENTINEL);

      // Identify the component's 500ms debounce schedule. handleSearchChange
      // calls `setTimeout(..., 500)` exactly once per keystroke. We pick the
      // most-recent 500ms schedule (delay arg === 500) as the captured
      // debounce handle.
      const debounceSetCalls = setSpy.mock.calls.filter(
        (call) => call[1] === 500
      );
      expect(debounceSetCalls.length).toBeGreaterThanOrEqual(1);
      const debounceHandle = setSpy.mock.results
        .filter((_, i) => setSpy.mock.calls[i][1] === 500)
        .pop()?.value;
      expect(debounceHandle).toBeDefined();

      // Pre-unmount: there may be 0..N additional invocations as React
      // re-renders for setSearchQuery (the searchQuery state, NOT the
      // debounced one, drives the input value). The hook is called with
      // q: debouncedSearch || undefined, so until the timer fires the
      // hook is NOT invoked with q === SENTINEL.
      const callsAtUnmount = mockUseAdminGetCustomersQuery.mock.calls.length;

      // Snapshot whether the SENTINEL has appeared as a `q` value yet.
      // It should not have (the debounce hasn't fired).
      const sentinelBeforeAdvance = mockUseAdminGetCustomersQuery.mock.calls.some(
        (call) => (call[0] as { q?: string } | undefined)?.q === SENTINEL
      );
      expect(sentinelBeforeAdvance).toBe(false);

      const clearCallsBeforeUnmount = clearSpy.mock.calls.length;

      // Unmount BEFORE advancing fake timers. The cleanup effect must clear
      // the captured 500ms debounce handle so the orphaned setDebouncedSearch
      // never runs.
      utils.unmount();

      // Contract A — the cleanup effect was called on the COMPONENT'S
      // captured debounce handle (not on some arbitrary other timer). The
      // only path to clearTimeout(<debounceHandle>) after unmount is the
      // useEffect cleanup; without it, this assertion fails — verified by
      // temporarily reverting the cleanup effect during test authoring.
      const clearedDuringTeardown = clearSpy.mock.calls
        .slice(clearCallsBeforeUnmount)
        .some((call) => call[0] === debounceHandle);
      expect(clearedDuringTeardown).toBe(true);

      // Run remaining timers. With the cleanup wired the debounce handle is
      // already cancelled — even if other unrelated timers (RTK Query
      // internals, safe-area, etc.) fire, none of them invoke our mocked
      // query with q === SENTINEL.
      jest.runOnlyPendingTimers();

      // Contract B — the downstream side-effect (query re-invocation with
      // the typed q) never happens at any point in the lifecycle. This is
      // the user-visible guarantee: no setState-after-unmount, no leaked
      // query trigger with stale typed text.
      const sentinelAfterAdvance =
        mockUseAdminGetCustomersQuery.mock.calls.some(
          (call) => (call[0] as { q?: string } | undefined)?.q === SENTINEL
        );
      expect(sentinelAfterAdvance).toBe(false);

      // Reference the call counters so jest reports them in failure output.
      expect(callsAtUnmount).toBeGreaterThanOrEqual(callsBeforeTyping);

      setSpy.mockRestore();
      clearSpy.mockRestore();
    }
  );

  // SOURCE-REGEX backstop, matching the precedent in
  // AdminScheduleScreen.polish.test.ts. The fix landed even if both
  // behavioral tests are gamed must still include a real useEffect cleanup
  // for the searchTimeoutRef.
  test(
    'C-STATE-03: source contains a useEffect cleanup that clears searchTimeoutRef on unmount',
    () => {
      const src = readSrc();

      // Acceptable shapes for the cleanup:
      //   (a) useEffect(() => () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); }, []);
      //   (b) useEffect(() => { return () => { ... clearTimeout(searchTimeoutRef.current) ... }; }, []);
      // Either way we must see clearTimeout(searchTimeoutRef.current) inside
      // some effect with an empty dep array. The buggy current code has NO
      // useEffect referencing searchTimeoutRef at all — only the
      // `if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); }`
      // inside `handleSearchChange` (which is per-keystroke, not unmount).

      // 1) The file must reference searchTimeoutRef inside a useEffect.
      //    (Multiline match — the cleanup is typically a return inside a
      //    useEffect callback that spans 2-4 lines.)
      const usesEffectForCleanup =
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*[\s\S]*?clearTimeout\s*\(\s*searchTimeoutRef\.current[\s\S]*?\)\s*,\s*\[\s*\]\s*\)/m.test(
          src
        ) ||
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*\(\s*\)\s*=>\s*[\s\S]*?clearTimeout\s*\(\s*searchTimeoutRef\.current/m.test(
          src
        );

      expect(usesEffectForCleanup).toBe(true);
    }
  );
});

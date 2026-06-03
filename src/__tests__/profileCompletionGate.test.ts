// src/__tests__/profileCompletionGate.test.ts
//
// C-STATE-02 (pre-ship audit 2026-06-03)
// ---------------------------------------------------------------------------
// INTENDED BEHAVIOR (pin):
//   In `src/navigation/RootNavigator.tsx`, when the user is authenticated and
//   their role is NOT 'admin', the navigator MUST treat a getMe ERROR (network
//   timeout / 5xx / offline → `data === undefined` AND `isError === true`)
//   as "cannot determine profile completion" and render a retry/loading
//   state — it must NOT fall through to `CustomerTabs` (the `TabNavigator`),
//   which would let an incomplete-profile customer bypass the
//   `CompleteProfileWizard` on a failed fetch.
//
//   Today the navigator only destructures `data` and `isLoading` from
//   `useGetMeQuery` (RootNavigator.tsx:40-42). On an error, `data` is
//   undefined and `isLoading` is false, so `needsProfileCompletion` is
//   falsy AND the `isMeLoading` branch is skipped → the final `else`
//   renders `CustomerTabs` with `TabNavigator`. A brand-new customer whose
//   first getMe call fails lands inside the booking UI with an empty
//   profile.
//
//   The fix must:
//     (a) Also destructure `isError` (and ideally `error`) from
//         `useGetMeQuery`.
//     (b) Add an explicit branch BEFORE the fallthrough to `CustomerTabs`
//         that handles the "errored / could-not-determine" case (render a
//         retry screen or a loading state — anything that is not
//         `TabNavigator`). RTK Query auto-refetches on remount/focus/
//         reconnect, so a simple "Loading" placeholder self-heals.
//
//   The OBSERVABLE contract:
//     - `useGetMeQuery`'s `isError` (or `error`) is read by RootNavigator.
//     - An error/uncertain branch exists in the render ladder BEFORE the
//       final `CustomerTabs` fallthrough.
//
// WHY A SOURCE-REGEX GUARD HERE
// A behavioral render of `RootNavigator` would require mounting
// `NavigationContainer` + a real Redux store (or carefully mocked
// selectors) + stubbing every nested screen component the
// `createNativeStackNavigator` renders for the chosen route. That mock
// surface is large and brittle relative to the precision of the contract
// we want to pin: two source-level invariants (read `isError`, branch on
// it). The implementer is free to convert this to a true rendered test
// once the new branch exists and the mock surface stabilizes.
//
// This file does NOT import `RootNavigator` — it reads the source as text.
// That keeps the test process free of expo-* / navigation / SecureStore
// transitive side effects for a purely static check.

import * as fs from 'fs';
import * as path from 'path';

const rootNavigatorPath = path.resolve(
  __dirname,
  '..',
  'navigation',
  'RootNavigator.tsx'
);

function readSource(): string {
  return fs.readFileSync(rootNavigatorPath, 'utf8');
}

describe('C-STATE-02 — profile-completion gate must not fail open on a getMe error', () => {
  // Sanity: confirm the file is on disk and still uses useGetMeQuery + the
  // customer-tabs fallthrough we are guarding. If these break the test
  // file path is stale — the implementer needs to refresh the regex.
  test('sanity: RootNavigator.tsx still consumes useGetMeQuery and renders CustomerTabs/TabNavigator', () => {
    const src = readSource();
    expect(src).toMatch(/useGetMeQuery\s*\(/);
    expect(src).toMatch(/CustomerTabs/);
    expect(src).toMatch(/TabNavigator/);
  });

  // Intended (1/2): RootNavigator must read `isError` (and ideally `error`)
  // from useGetMeQuery so it can distinguish "loading" from "errored /
  // can't determine". Today only `data` and `isLoading` are destructured
  // — exactly the bug. We accept either:
  //   const { ..., isError, ... } = useGetMeQuery(...)
  //   const { ..., error, ... } = useGetMeQuery(...)
  // (Either signals the implementer added an error-aware branch.)
  test(
    'C-STATE-02: RootNavigator destructures `isError` (or `error`) from useGetMeQuery so the error path is observable',
    () => {
      const src = readSource();

      // Find the destructuring on the useGetMeQuery call. The current
      // shape is `const { data: meData, isLoading: isMeLoading } =
      // useGetMeQuery(...)`. We look at the destructure body specifically
      // — a stray `isError` somewhere unrelated must not satisfy this.
      const destructureMatch = src.match(
        /const\s*\{([^}]*)\}\s*=\s*useGetMeQuery\s*\(/
      );
      expect(destructureMatch).not.toBeNull();
      const body = (destructureMatch as RegExpMatchArray)[1];

      // Either `isError` or `error` must appear in the destructure body
      // (with optional rename, e.g. `isError: meError`).
      const readsErrorSignal = /\bisError\b/.test(body) || /\berror\b/.test(body);
      expect(readsErrorSignal).toBe(true);
    }
  );

  // Intended (2/2): the render ladder must branch on the error/uncertain
  // case BEFORE the final CustomerTabs fallthrough. The simplest pin:
  // some token from the error signal (`isError`, `meError`, `error`, or
  // a clearly error-named local like `meErr`) appears in the JSX branches
  // (after `// Route based on auth state and role`) and before the
  // terminal `CustomerTabs` with `TabNavigator` mapping.
  //
  // We do NOT prescribe the exact branch shape — the implementer may
  // render a Retry screen, a Loading placeholder, or re-show the splash.
  // We only assert that an error-aware condition gates the CustomerTabs/
  // TabNavigator fallthrough.
  test(
    'C-STATE-02: the render ladder branches on the getMe error BEFORE falling through to CustomerTabs/TabNavigator',
    () => {
      const src = readSource();

      // Carve out the "Route based on auth state and role" region — that
      // is where the render ladder lives. If the marker comment is ever
      // renamed/deleted, the implementer should update this anchor.
      const routeMarker = '// Route based on auth state and role';
      const markerIdx = src.indexOf(routeMarker);
      expect(markerIdx).toBeGreaterThan(-1);

      const renderLadder = src.slice(markerIdx);

      // An error-named identifier must appear inside the render ladder
      // (matching the destructure rename — `isError`, `meError`, `error`).
      // This pins that the new branch actually uses the new signal.
      const errorIdentifierInLadder =
        /\bisError\b/.test(renderLadder) ||
        /\bmeError\b/.test(renderLadder) ||
        /\bmeErr\b/.test(renderLadder) ||
        /\berror\b/.test(renderLadder);
      expect(errorIdentifierInLadder).toBe(true);

      // And the error identifier must appear BEFORE the terminal
      // CustomerTabs/TabNavigator pairing in the JSX so it actually gates
      // the fallthrough (rather than being a downstream prop on
      // TabNavigator). We search for the FIRST occurrence of any error
      // identifier and the FIRST occurrence of the TabNavigator binding,
      // and require the error identifier to come first.
      const firstErrorIdxRaw = Math.min(
        ...['isError', 'meError', 'meErr', 'error']
          .map((id) => renderLadder.search(new RegExp('\\b' + id + '\\b')))
          .filter((idx) => idx >= 0)
      );
      const firstErrorIdx = Number.isFinite(firstErrorIdxRaw)
        ? firstErrorIdxRaw
        : -1;

      // The terminal fallthrough we're guarding looks like
      //   <Stack.Screen name="CustomerTabs" component={TabNavigator} />
      // Match the component={TabNavigator} pairing specifically so we
      // don't catch the earlier `component={LoadingScreen}` (which uses
      // the same "CustomerTabs" name during loading).
      const tabNavigatorBindingIdx = renderLadder.search(
        /component=\{TabNavigator\}/
      );

      expect(firstErrorIdx).toBeGreaterThan(-1);
      expect(tabNavigatorBindingIdx).toBeGreaterThan(-1);
      expect(firstErrorIdx).toBeLessThan(tabNavigatorBindingIdx);
    }
  );
});

// src/navigation/__tests__/RootNavigator.authAudit.test.ts
//
// AUTH_AUDIT_2026-06-10 findings #1, #6, #17 — RootNavigator guardrails
// ---------------------------------------------------------------------------
//
// These guards pin three SOURCE-LEVEL contracts on
// `src/navigation/RootNavigator.tsx`. They are written as `test.failing`
// per the Bugs Policy — they encode the INTENDED behavior the audit
// prescribes, while today's code still ships the buggy behavior they
// describe. Drop `.failing` only after the orchestrator's fix lands and
// `npm test` reports "Failing test passed even though it was supposed to
// fail" — see `connevia/.claude/REVIEW_FINDINGS.md` "Bugs Policy" header.
//
// WHY SOURCE-REGEX HERE
// A behavioral render of `RootNavigator` would require mounting
// `NavigationContainer` + a real Redux store + stubbing all nested screen
// components and the `useGetMeQuery` hook with refetch semantics — a large
// and brittle mock surface relative to the small, precise contracts we
// want to pin. This file mirrors the pattern already in use for the
// sibling `profileCompletionGate.test.ts` (C-STATE-02). The implementer
// is free to convert any of these to a true rendered test once the new
// branches/screens stabilize.
//
// FINDINGS PINNED
//   #1 [HIGH] meCannotBeDetermined branch must offer a USER ESCAPE — a
//             pressable wired to `useGetMeQuery().refetch` + an Arabic
//             message — instead of the current bare `<ActivityIndicator />`
//             that leaves the user stuck on a blank spinner until force-
//             quit. (RootNavigator.tsx:114-128.)
//   #6  [MED] The customer-vs-admin routing decision must use the SERVER
//             role (`meData?.user?.role`) as the EFFECTIVE role, not solely
//             the JWT-decoded role from the Redux slice. An admin whose
//             access token lacks the role claim today gets routed to
//             CustomerTabs. (RootNavigator.tsx:37, 123.)
//   #17 [LOW] The invalid-token restart branch ("Failed to decode stored
//             token") must `dispatch(logout())` (full teardown — both
//             SecureStore slots cleared via the slice reducer, RTK cache
//             reset elsewhere) rather than only deleting the access-token
//             key + `finishRestoring()`. (RootNavigator.tsx:74-78.)

import * as fs from 'fs';
import * as path from 'path';

const rootNavigatorPath = path.resolve(
  __dirname,
  '..',
  'RootNavigator.tsx'
);

function readSource(): string {
  return fs.readFileSync(rootNavigatorPath, 'utf8');
}

describe('RootNavigator — AUTH_AUDIT_2026-06-10 guards (#1, #6, #17)', () => {
  // -------- SANITY ANCHORS --------
  // If these break the file shape has shifted enough that the audit
  // findings need re-mapping — bail loudly instead of pretending to pass.
  test('sanity: RootNavigator.tsx exists and still consumes useGetMeQuery + selectRole', () => {
    const src = readSource();
    expect(src).toMatch(/useGetMeQuery\s*\(/);
    expect(src).toMatch(/selectRole/);
    // Today's invalid-token branch still references finishRestoring +
    // deleteItemAsync; if that ever changes the #17 guard's "before" shape
    // is gone and the .failing should be re-evaluated.
    expect(src).toMatch(/finishRestoring|logout/);
  });

  // ===================================================================
  // FINDING #1 (HIGH) — meCannotBeDetermined must offer a RETRY escape
  // ===================================================================
  //
  // Today the `meCannotBeDetermined` branch (RootNavigator.tsx:127-128)
  // renders `<Stack.Screen name="CustomerTabs" component={LoadingScreen}/>`
  // where `LoadingScreen` is a bare `<ActivityIndicator />` (lines 16-20).
  // The inline comment claims "RTK Query auto-refetches on remount/focus/
  // reconnect, so the placeholder self-heals" — the audit confirms this
  // is FALSE: `setupListeners(store.dispatch)` is never called and no
  // `refetchOn*` flags are set, so a customer whose `GET /v1/me` errors
  // has no path out short of force-quitting the app.
  //
  // Pin: the file must contain a USER-INVOKED RETRY affordance — a
  // pressable (Pressable / TouchableOpacity / Button) wired to the
  // `useGetMeQuery` refetch — AND an Arabic message string. We accept
  // either an inline retry screen component OR an imported one, as long
  // as both observable contracts are visible in this file (so the gate
  // is provably wired here, not in some unrelated import).
  test(
    'AUTH_AUDIT_2026-06-10 #1: meCannotBeDetermined branch renders a RETRY pressable wired to useGetMeQuery refetch + Arabic message, NOT a bare ActivityIndicator',
    () => {
      const src = readSource();

      // (a) The `refetch` field must be read from `useGetMeQuery` (the
      //     only credible plumbing for a user-triggered retry).
      const destructureMatch = src.match(
        /const\s*\{([^}]*)\}\s*=\s*useGetMeQuery\s*\(/
      );
      expect(destructureMatch).not.toBeNull();
      const destructureBody = (destructureMatch as RegExpMatchArray)[1];
      expect(/\brefetch\b/.test(destructureBody)).toBe(true);

      // (b) A pressable affordance must exist in the file (one of
      //     Pressable, TouchableOpacity, or RN Button) — the bare
      //     `<ActivityIndicator />` shipped today provides none.
      const hasPressable =
        /<\s*Pressable\b/.test(src) ||
        /<\s*TouchableOpacity\b/.test(src) ||
        /<\s*Button\b/.test(src);
      expect(hasPressable).toBe(true);

      // (c) The pressable must be wired to the refetch identifier — we
      //     accept `onPress={refetch}`, `onPress={() => refetch()}`, or
      //     `onPress={handleRetry}`/`onPress={onRetry}` patterns where
      //     the handler name is one of the conventional retry names.
      //     The literal `refetch` must appear in an onPress binding OR
      //     be invoked inside a retry handler defined in this file.
      const onPressWithRefetch =
        /onPress\s*=\s*\{\s*\(?\s*\)?\s*=>\s*refetch\s*\(/.test(src) ||
        /onPress\s*=\s*\{\s*refetch\s*\}/.test(src) ||
        /(handleRetry|onRetry|retry)\s*=\s*\(?\s*\)?\s*=>\s*\{?[\s\S]{0,200}refetch\s*\(/.test(
          src
        );
      expect(onPressWithRefetch).toBe(true);

      // (d) An Arabic message must be present in the file. We pin to
      //     "any Arabic text" rather than a specific string so the
      //     implementer can choose the wording. The Arabic Unicode block
      //     is U+0600..U+06FF.
      const hasArabic = /[؀-ۿ]/.test(src);
      expect(hasArabic).toBe(true);

      // (e) The meCannotBeDetermined branch must no longer render the
      //     `LoadingScreen` placeholder. Today the buggy line reads:
      //       meCannotBeDetermined ? (
      //         <Stack.Screen name="CustomerTabs" component={LoadingScreen} />
      //       )
      //     The fix should swap `component={LoadingScreen}` for a real
      //     retry-capable screen on that arm. We allow `LoadingScreen` to
      //     STILL appear on the explicit `isMeLoading` arm above (that
      //     branch is fine — it's a transient loading state, not the
      //     stuck-error one). So we scope the assertion to the
      //     `meCannotBeDetermined ?` ternary arm.
      const meCannotBeDeterminedArm = src.match(
        /meCannotBeDetermined\s*\?\s*\(([\s\S]*?)\)\s*:/
      );
      expect(meCannotBeDeterminedArm).not.toBeNull();
      const armBody = (meCannotBeDeterminedArm as RegExpMatchArray)[1];
      expect(/component=\{LoadingScreen\}/.test(armBody)).toBe(false);
    }
  );

  // ===================================================================
  // FINDING #6 (MED) — effective role must come from the SERVER (me.role)
  // ===================================================================
  //
  // Today RootNavigator branches on `role` from the Redux slice (line 37),
  // which `decodeAccessToken` derived from the JWT (line 56-73 in the
  // bootstrap, plus `useAuth.login` paths). The audit found that if the
  // Auth0 token lacks the role claim — possible while the role-claim
  // rule is mis-configured or for first-login transient states — an
  // admin gets routed to CustomerTabs.
  //
  // Pin: the customer-vs-admin branch must read from `meData.user.role`
  // (or an equivalent server-derived local — `effectiveRole`,
  // `serverRole`, `meRole`) in the ternary that picks AdminTabs vs
  // CustomerTabs. The JWT-decoded `role` may remain as a fallback
  // (`meData?.user?.role ?? role`), but it must NOT be the SOLE input.
  test(
    'AUTH_AUDIT_2026-06-10 #6: customer-vs-admin route uses meData.user.role as the effective role (not solely the JWT-decoded role)',
    () => {
      const src = readSource();

      // Carve out the render ladder region (after the "Route based on
      // auth state and role" marker) — the audit calls out the admin
      // branch specifically at RootNavigator.tsx:123, which lives here.
      const routeMarker = '// Route based on auth state and role';
      const markerIdx = src.indexOf(routeMarker);
      expect(markerIdx).toBeGreaterThan(-1);
      const renderLadder = src.slice(markerIdx);

      // The admin/customer-tabs branches in the ladder. Today this is:
      //   role === 'admin' ? (...AdminTabs...) : ...
      // We accept any of:
      //   meData?.user?.role === 'admin'
      //   meData.user.role === 'admin'
      //   effectiveRole === 'admin'   (with an upstream `const effectiveRole = meData?.user?.role ?? role`)
      //   serverRole === 'admin'
      //   meRole === 'admin'
      // The check fails if the ONLY admin-branch input is the bare slice
      // `role` (i.e. the current buggy state).
      const usesServerRoleDirectly =
        /meData\??\.user\??\.role\s*===\s*['"]admin['"]/.test(renderLadder) ||
        /\beffectiveRole\s*===\s*['"]admin['"]/.test(renderLadder) ||
        /\bserverRole\s*===\s*['"]admin['"]/.test(renderLadder) ||
        /\bmeRole\s*===\s*['"]admin['"]/.test(renderLadder);

      // OR — the implementer may compute an `effectiveRole` local
      // upstream of the ladder and use THAT in the ternary. Detect the
      // shape `const effectiveRole = meData?.user?.role ?? role` (or the
      // strict-equality form) AND that the ladder uses it.
      const computesEffectiveRoleUpstream =
        /const\s+(effectiveRole|serverRole|meRole)\s*=\s*meData\??\.user\??\.role\s*(\?\?|\|\|)\s*role/.test(
          src
        ) &&
        /(effectiveRole|serverRole|meRole)\s*===\s*['"]admin['"]/.test(
          renderLadder
        );

      expect(usesServerRoleDirectly || computesEffectiveRoleUpstream).toBe(
        true
      );
    }
  );

  // ===================================================================
  // FINDING #17 (LOW) — invalid-token restart branch must dispatch logout()
  // ===================================================================
  //
  // Today the bootstrap "failed to decode" branch (RootNavigator.tsx:74-78)
  // does:
  //   console.error('[Auth] Failed to decode stored token');
  //   await SecureStore.deleteItemAsync(TOKEN_KEY);
  //   dispatch(finishRestoring());
  // Only the ACCESS token slot is cleared. The refresh-token slot
  // (`connevia.refresh_token`) is left behind, and there's no full
  // teardown of the Redux auth state. The audit prescribes `logout()`
  // here — its reducer (authSlice.ts:55-68) clears BOTH SecureStore slots
  // AND wipes the auth state to defaults, which is the correct behavior
  // for "the persisted token is corrupted; start clean".
  //
  // Pin: inside the `if (decoded)` else-branch (i.e. when
  // `decodeAccessToken(token)` returns null), the source must
  // `dispatch(logout())`. The `finishRestoring()` line must be removed
  // from this branch (logout itself sets `isRestoring: false`). The
  // delete-access-token line is allowed to remain (it's redundant after
  // logout but harmless) or be removed.
  test(
    'AUTH_AUDIT_2026-06-10 #17: invalid-token (decode-failed) restart branch dispatches logout() for full teardown, not just deleteItemAsync(TOKEN_KEY)',
    () => {
      const src = readSource();

      // Carve out the bootstrap function body so we don't accidentally
      // match the EXPIRED-token branch (which already dispatches
      // logout()) or the catch block.
      const bootstrapMatch = src.match(
        /const\s+bootstrapAuth\s*=\s*async[^=]*=>\s*\{([\s\S]*?)\n\s*\};/
      );
      expect(bootstrapMatch).not.toBeNull();
      const bootstrapBody = (bootstrapMatch as RegExpMatchArray)[1];

      // The "Failed to decode" log line is the anchor that uniquely
      // identifies the invalid-token else-branch. Locate it and slice
      // forward a bounded window — the branch is short (~5 lines today).
      const failedDecodeIdx = bootstrapBody.indexOf(
        'Failed to decode stored token'
      );
      expect(failedDecodeIdx).toBeGreaterThan(-1);
      const decodeFailedBranch = bootstrapBody.slice(
        failedDecodeIdx,
        failedDecodeIdx + 400
      );

      // (a) Must dispatch logout() in this branch.
      const dispatchesLogout = /dispatch\(\s*logout\s*\(\s*\)\s*\)/.test(
        decodeFailedBranch
      );
      expect(dispatchesLogout).toBe(true);

      // (b) Must NOT continue to call `finishRestoring()` in this
      //     branch (logout's reducer already flips isRestoring to false;
      //     keeping finishRestoring is a leftover from the buggy code).
      const stillCallsFinishRestoring = /finishRestoring\s*\(\s*\)/.test(
        decodeFailedBranch
      );
      expect(stillCallsFinishRestoring).toBe(false);
    }
  );
});

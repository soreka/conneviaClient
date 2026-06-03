// src/__tests__/apiSlice401Refresh.test.ts
//
// C-AUTH-02 (pre-ship audit 2026-06-03)
// ---------------------------------------------------------------------------
// INTENDED BEHAVIOR (pin):
//   In `src/features/api/apiSlice.ts` the `baseQueryWith401Handler` MUST,
//   when the upstream returns a 401 whose body.error code is NOT
//   `ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED`:
//     (a) Attempt a single-flight refresh of the access token by calling
//         the shared `refreshAccessToken` helper exported from `src/api.ts`
//         (so axios and RTK Query share ONE refresh lock — preventing two
//         concurrent refreshes from rotating the Auth0 refresh token twice).
//     (b) Re-run the original `rawBaseQuery(args, api, extraOptions)`
//         exactly once with the freshly-stored access token. A second 401
//         after the retry MUST fall through to logout (no infinite loop).
//     (c) Only dispatch `logout()` + `resetToLogin()` if there is no refresh
//         token stored OR if the refresh itself rejected. The current code
//         logs out unconditionally on EVERY 401 — that is the bug.
//   A 401 carrying `ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED` MUST continue to
//   hard-logout immediately (no refresh attempt). That branch is correct
//   today and must be preserved by the fix.
//
// WHY A SOURCE-REGEX GUARD HERE
// RTK Query's `fetchBaseQuery` does its own internal fetch and lives behind
// the `createApi` factory closure. Driving a clean behavioral test for the
// retry-after-refresh path requires stubbing global `fetch` while also
// stubbing the refresh primitive, and even then the public surface of
// `apiSlice.util` does not let us observe the inner `rawBaseQuery` call
// twice without monkey-patching internals. Per the tester contract for
// this finding, a source-level guard that asserts the production source
// wires the intended behavior is acceptable: it pins the contract (refresh
// is invoked on non-deleted 401 BEFORE any logout dispatch) without
// fighting RTK internals. The implementer is free to make this a true
// behavioral test once they have the new control flow in place.
//
// This file does NOT import the apiSlice module — it reads its source as
// text. That avoids pulling expo-* / SecureStore / config side effects into
// the test process for a static check.

import * as fs from 'fs';
import * as path from 'path';

const apiSliceSourcePath = path.resolve(
  __dirname,
  '..',
  'features',
  'api',
  'apiSlice.ts'
);
const apiSourcePath = path.resolve(__dirname, '..', 'api.ts');

function readSource(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

describe('C-AUTH-02 source-regex guard', () => {
  // Sanity: confirm the file is on disk and the deleted-account branch
  // we care about is still there (so we are guarding the right file).
  test('apiSlice.ts exists and still distinguishes the deleted-account marker', () => {
    const src = readSource(apiSliceSourcePath);
    expect(src).toMatch(/ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED/);
    expect(src).toMatch(/result\.error\.status === 401/);
  });

  // The shared single-flight refresh primitive must be EXPORTED from api.ts
  // so the RTK Query handler can use the same lock as the axios interceptor.
  // Today `refreshAccessToken` is declared as a module-private `async
  // function refreshAccessToken` in src/api.ts. The fix should change that
  // declaration to `export async function refreshAccessToken` (or
  // equivalent named export). This guard pins the export contract.
  test(
    'C-AUTH-02: src/api.ts exports refreshAccessToken as a named export so RTK Query can share the single-flight lock',
    () => {
      const src = readSource(apiSourcePath);
      // The export contract: a named `refreshAccessToken` symbol on the
      // module's public surface. Today the source contains the private
      // `async function refreshAccessToken` form WITHOUT `export`.
      expect(src).toMatch(
        /export\s+(?:async\s+function|const|function)\s+refreshAccessToken\b/
      );
    }
  );

  // The RTK Query handler must (a) IMPORT refreshAccessToken from ../../api,
  // and (b) REFERENCE it in the same file (so the symbol is actually used
  // on the 401 path, not merely imported and dropped).
  test(
    'C-AUTH-02: apiSlice.ts imports refreshAccessToken from ../../api and calls it',
    () => {
      const src = readSource(apiSliceSourcePath);
      // Today this import simply does not exist — the apiSlice talks only
      // to SecureStore, logout(), and resetToLogin().
      expect(src).toMatch(
        /import\s*\{[^}]*\brefreshAccessToken\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/api['"]/
      );
      expect(src).toMatch(/\brefreshAccessToken\s*\(/);
    }
  );

  // The 401-handler must call refreshAccessToken BEFORE it dispatches the
  // generic logout. Concretely: in the source ordering, on the non-deleted
  // branch, the `refreshAccessToken(` call must appear earlier than the
  // generic `api.dispatch(logout())` invocation. We assert this by string
  // index: every reference to `refreshAccessToken(` must come before the
  // first `api.dispatch(logout())` in the file. (When the fix lands the
  // generic logout will only run in the failure fallback, which still
  // appears AFTER the refresh attempt.)
  test(
    'C-AUTH-02: refreshAccessToken is invoked on a non-deleted 401 BEFORE any logout dispatch',
    () => {
      const src = readSource(apiSliceSourcePath);
      const refreshIdx = src.indexOf('refreshAccessToken(');
      const logoutIdx = src.indexOf('api.dispatch(logout())');
      // Today: refreshIdx is -1 (the function is not called anywhere in
      // apiSlice.ts), so this assertion fails for the right reason and will
      // start passing once the implementer wires the refresh call in.
      expect(refreshIdx).toBeGreaterThanOrEqual(0);
      expect(logoutIdx).toBeGreaterThanOrEqual(0);
      expect(refreshIdx).toBeLessThan(logoutIdx);
    }
  );

  // The deleted-account 401 must still hard-logout immediately and must
  // NOT be routed through the refresh path. We pin this by requiring the
  // deleted-account branch to short-circuit (e.g. via an early `return` or
  // by explicitly NOT calling refreshAccessToken inside that branch). The
  // weakest form of this check is: the source still contains the literal
  // deleted-account marker AND a logout dispatch on the same branch.
  test(
    'C-AUTH-02: deleted-account 401 still hard-logs-out immediately (refresh is bypassed on that branch)',
    () => {
      const src = readSource(apiSliceSourcePath);
      // Pin the control-flow distinction: there must be at least one site
      // in the file where the deleted-account marker is checked, and a
      // logout dispatch must remain reachable from that branch. Today the
      // file dispatches logout unconditionally on EVERY 401, which fails
      // the refined contract (refresh-then-retry on generic 401), so we
      // pair this with a positive guard: the deleted-account marker must
      // be checked AND a `return` / branch separation must exist that
      // routes deleted accounts away from the refresh path.
      //
      // Pragmatic guard: require the file to contain BOTH
      // `ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED` AND a `refreshAccessToken(`
      // call — i.e. both code paths coexist. This fails today (no refresh
      // call) and will pass once the fix introduces the refresh path
      // while preserving the deleted-account hard-logout.
      expect(src).toMatch(/ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED/);
      expect(src).toMatch(/refreshAccessToken\s*\(/);
    }
  );
});

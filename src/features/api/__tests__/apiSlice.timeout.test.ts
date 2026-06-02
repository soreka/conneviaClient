// CLIENT-2.7b regression guard.
//
// Finding: `src/features/api/apiSlice.ts` constructs `rawBaseQuery` via
// `fetchBaseQuery({ baseUrl, prepareHeaders })` with NO `timeout` option.
// Nearly all app data flows through RTK Query, so on a flaky cellular link
// requests can hang forever and the user sees an infinite spinner. The
// CLIENT-2.7 fix (axios `timeout: 15000`) only covers the two callers of
// the `api` axios instance (`POST /v1/me/bootstrap`, `GET /v1/me`); RTK
// Query's `fetchBaseQuery` was not touched.
//
// Intended fix (implementer, separately): add `timeout: 15000` to the
// `fetchBaseQuery({ ... })` options in `src/features/api/apiSlice.ts`.
// On timeout RTK Query's fetchBaseQuery aborts the request and returns
// `{ error: { status: 'TIMEOUT_ERROR' } }`.
//
// === Why a SOURCE-REGEX guard, not a runtime/behavioral test ===
// The preferred approach (Option A in the brief) would be to import
// `rawBaseQuery`, stub `global.fetch` with a never-resolving promise that
// rejects with an `AbortError` when its `signal` aborts, advance Jest fake
// timers past 15s, and assert the result is
// `{ error: { status: 'TIMEOUT_ERROR' } }`. That proves the wiring at
// runtime.
//
// However, `rawBaseQuery` is module-private (declared `const` at
// `apiSlice.ts:17`, not exported). A behavioral test would require adding
// `export` to that const — a PRODUCTION-CODE change, which is strictly the
// implementer's job, not the tester's. Per the Bugs Policy in
// `.claude/REVIEW_FINDINGS.md` ("How to use this file" + "Production
// safety guardrails"), we may NOT edit production code from a test agent.
//
// Falling back to Option B: read the apiSlice source as a string and
// assert that the `fetchBaseQuery(...)` call literally contains a
// `timeout:` of at least 15000. This goes RED today (no `timeout` in the
// options object) and turns GREEN the moment the implementer adds
// `timeout: 15000`.

import * as fs from 'fs';
import * as path from 'path';

describe('apiSlice rawBaseQuery — request timeout', () => {
  test.failing(
    'CLIENT-2.7b: RTK Query base query enforces a request timeout',
    () => {
      const apiSlicePath = path.resolve(
        __dirname,
        '..',
        'apiSlice.ts'
      );
      const src = fs.readFileSync(apiSlicePath, 'utf8');

      // Match the FIRST fetchBaseQuery({...}) options object in the file
      // (there's only one in apiSlice.ts today — `rawBaseQuery`). Use a
      // non-greedy capture so we don't run past the closing `})`.
      const optionsMatch = src.match(/fetchBaseQuery\(\s*\{([\s\S]*?)\}\s*\)/);
      expect(optionsMatch).not.toBeNull();

      const optionsBody = optionsMatch![1];

      // The options object must contain a `timeout:` key with a numeric
      // literal value >= 15000. We grep within the captured options body
      // only — not the whole file — so an unrelated `timeout` token (e.g.
      // a `setTimeout(... , 2000)` in the 401 handler below) can't satisfy
      // this assertion by accident.
      const timeoutMatch = optionsBody.match(/\btimeout\s*:\s*(\d+)/);
      expect(timeoutMatch).not.toBeNull();

      const timeoutMs = Number(timeoutMatch![1]);
      expect(timeoutMs).toBeGreaterThanOrEqual(15000);
    }
  );
});

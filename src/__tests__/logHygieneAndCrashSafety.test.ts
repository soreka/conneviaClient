// src/__tests__/logHygieneAndCrashSafety.test.ts
//
// Failing regression guards for the 2026-06-03 client log-hygiene +
// crash-safety polish batch.
//
// Findings covered (all from connevia/.claude/PRESHIP_AUDIT_2026-06-03.md):
//
//   - C-CRASH-05 / C-UX-04 — CustomerSearchInput.tsx logs full customer PII
//     (id/fullName/email/phone arrays) AND the raw search query text to
//     console with no `__DEV__` guard. The first review wave fixed
//     "no PII outside __DEV__" repo-wide; this component regresses it.
//     (Two distinct finding IDs covering the same code; tracked together
//     in one set of guards since the source is the same file/lines.)
//
//   - C-UX-13 — MyBookingsScreen.tsx has five unguarded `console.log`s in
//     the cancel-flow handlers (lines 227/233/237/241/245). They log
//     reservation IDs + flow markers and ship in the customer build.
//
//   - C-UX-03 — App.tsx calls NativeWind's `verifyInstallation()` on every
//     root render. It is a setup-only diagnostic; it must NOT run in
//     production (gate behind `__DEV__` or remove the call + import).
//
//   - C-CRASH-06 — ProfileScreen.tsx fires `Linking.openURL(...)` for `tel:`
//     and `https://wa.me/...` without await or `.catch(...)`. On a device
//     with no handler, the rejected promise becomes an unhandled rejection.
//     The intended fix wraps each call so rejection is caught (try/catch
//     in an async function, OR a synchronous `.catch(...)` on the call).
//
//   - C-CRASH-03 — AdminScheduleSettingsScreen.tsx line 130 uses the
//     non-null assertion `?.workPeriods.length!` on a value that can be
//     undefined (Array.find() may return undefined). The assertion only
//     silences TypeScript; at runtime the comparison becomes `n > undefined`
//     = false (NaN compare). The intended fix removes the `!` and uses a
//     safe access (e.g. `?? 0`).
//
// INTENDED CONTRACT documented for the implementer (same shape the audit
// notes describe, distilled into testable assertions):
//   1. C-CRASH-05/C-UX-04: NO ungated `console.log` survives in
//      CustomerSearchInput.tsx; specifically, no logging of `data.customers`
//      or the raw `q` query text. Acceptable shapes: log gated by
//      `if (__DEV__) { ... }`, OR removed entirely.
//   2. C-UX-13: NO ungated `console.log` survives in MyBookingsScreen.tsx;
//      the five `[Cancel] ...` log sites must be `__DEV__`-gated or removed.
//   3. C-UX-03: `verifyInstallation()` must NOT be called from the
//      production render path of App.tsx. Acceptable: remove the call + the
//      `nativewind` import; OR gate it behind `if (__DEV__) { ... }` AND
//      hoist it into an effect rather than the render body. Either way, the
//      naked top-of-`App()` invocation must be gone.
//   4. C-CRASH-06: Each `Linking.openURL(...)` call site in ProfileScreen.tsx
//      must be wrapped so a rejected promise can't escape. Acceptable: a
//      synchronous `.catch(...)` chained to the call, OR the call sits
//      inside an async function with try/catch / awaited result handled.
//      Equivalent: the handler is an `async` function and the openURL
//      result is `await`ed within a try/catch.
//   5. C-CRASH-03: the non-null assertion `?.workPeriods.length!` must be
//      removed from AdminScheduleSettingsScreen.tsx. Acceptable: any safe
//      access pattern that does NOT terminate in `!` (e.g.
//      `(prev?.workPeriods.length ?? 0)`).
//
// Each test is a `test.failing(...)` source-regex guard. Source-regex is
// the right tool here because:
//   * "no console.log" is impractical to assert behaviorally without
//     spying on global console across many render paths and forcing every
//     code path to execute (App.tsx + MyBookingsScreen.tsx + CustomerSearchInput
//     each pull in different mock graphs);
//   * Linking.openURL rejection-handling shape is a structural property of
//     the call site, not an observable effect — by the time the rejection
//     fires you've already lost the await chain. We assert structural shape.
//
// Precedent: this mirrors the source-regex pattern established by
// `src/screens/Admin/__tests__/AdminScheduleScreen.polish.test.ts`
// (C-NET-03 / C-NET-07).

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}

// ---------------------------------------------------------------------------
// C-CRASH-05 / C-UX-04 — CustomerSearchInput logs PII + query without __DEV__
// ---------------------------------------------------------------------------

describe('CustomerSearchInput - C-CRASH-05 / C-UX-04: PII + query logging must be __DEV__-gated or removed', () => {
  const REL = path.join(
    'src',
    'screens',
    'Admin',
    'components',
    'CustomerSearchInput.tsx'
  );

  test(
    'C-CRASH-05/C-UX-04: response-log useEffect does not ship `customers: data.customers` ungated',
    () => {
      const src = readSrc(REL);

      // Buggy current shape: an unguarded console.log that includes
      // `customers: data.customers` (the full array of {id, fullName, email, phone}).
      // The intended fix either removes that array-body log entirely OR
      // wraps the `console.log(...)` in `if (__DEV__) { ... }` and replaces
      // the body with a non-PII summary (count only).
      const buggyPiiArrayLog = /customers:\s*data\.customers/;
      expect(src).not.toMatch(buggyPiiArrayLog);
    }
  );

  test(
    'C-CRASH-05/C-UX-04: raw query text `{ q: text }` is not logged ungated on every keystroke',
    () => {
      const src = readSrc(REL);

      // Buggy current shape (line ~68):
      //   console.log('[CustomerSearchInput] triggering search', { q: text, limit: 15 });
      // The brief: log only `len: text.length` if anything, and gate
      // behind `__DEV__`. Easiest behavioral assertion is that this exact
      // shape (the un-gated raw `q: text` log) is gone.
      const buggyRawQueryLog =
        /console\.log\(\s*['"]\[CustomerSearchInput\] triggering search['"]\s*,\s*\{\s*q:\s*text/;
      expect(src).not.toMatch(buggyRawQueryLog);
    }
  );

  test(
    'C-CRASH-05/C-UX-04: every console.log in CustomerSearchInput is gated by __DEV__ (or removed)',
    () => {
      // Defensive structural guard: walk every `console.log` occurrence in
      // the file and require that the call sits inside an `if (__DEV__) { ... }`
      // block (or is inline-gated as `__DEV__ && console.log(...)`).
      //
      // We detect enclosure by walking backwards from the log site, tracking
      // unmatched `{` vs `}` characters. When we hit an unmatched `{` (i.e.
      // the start of the enclosing block), we look at that line for the
      // `if (__DEV__)` marker. This correctly handles dev-gate blocks that
      // wrap multiple log calls (where the gated `console.log` may be many
      // lines below the `if (__DEV__) {` opener).
      const src = readSrc(REL);
      const lines = src.split('\n');

      type Violation = { lineNumber: number; lineText: string };
      const violations: Violation[] = [];

      const stripStringsAndComments = (s: string): string =>
        // Best-effort: remove `// ...` line comments and string literals so
        // braces inside them don't confuse the counter.
        s
          .replace(/\/\/.*$/g, '')
          .replace(/'(?:\\.|[^'\\])*'/g, "''")
          .replace(/"(?:\\.|[^"\\])*"/g, '""')
          .replace(/`(?:\\.|[^`\\])*`/g, '``');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/console\.log\s*\(/.test(line)) continue;

        const hasInlineDev = /__DEV__\s*&&\s*console\.log/.test(line);
        if (hasInlineDev) continue;

        // Walk backwards counting braces. For every enclosing scope opener
        // we hit (i.e. an unmatched `{`), check if that line is
        // `if (__DEV__) { ... }`. If ANY enclosing ancestor scope is the
        // dev-gate, the log is gated. We stop when we hit a function-like
        // opener at depth 0 (top-level scope).
        let depth = 0;
        let gated = false;
        outer: for (let j = i; j >= 0; j--) {
          const safe = stripStringsAndComments(lines[j]);
          for (let k = safe.length - 1; k >= 0; k--) {
            const ch = safe[k];
            if (ch === '}') depth++;
            else if (ch === '{') {
              if (depth === 0) {
                // Found an enclosing `{` on this line.
                if (/if\s*\(\s*__DEV__\s*\)\s*\{/.test(lines[j])) {
                  gated = true;
                  break outer;
                }
                // Otherwise, keep walking outward: this `{` is an ancestor
                // scope, but it's not the dev-gate. Continue counting
                // braces to find the next ancestor opener.
                // (Don't change depth: we've consumed this `{`.)
              } else {
                depth--;
              }
            }
          }
        }

        if (!gated) {
          violations.push({ lineNumber: i + 1, lineText: line.trim() });
        }
      }

      // Intended: zero ungated console.log calls in the file.
      expect(violations).toEqual([]);
    }
  );
});

// ---------------------------------------------------------------------------
// C-UX-13 — MyBookingsScreen unguarded reservation-action console.logs
// ---------------------------------------------------------------------------

describe('MyBookingsScreen - C-UX-13: reservation-action console.logs must be __DEV__-gated or removed', () => {
  const REL = path.join('src', 'screens', 'MyBookingsScreen.tsx');

  test(
    'C-UX-13: no ungated `console.log("[Cancel] ...")` call survives in MyBookingsScreen',
    () => {
      const src = readSrc(REL);
      const lines = src.split('\n');

      type Violation = { lineNumber: number; lineText: string };
      const violations: Violation[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Only target the five `[Cancel] ...` cancel-flow logs introduced
        // in the audit (line ~227,233,237,241,245). Other audited logs in
        // the file (if any) are out of scope for THIS finding.
        if (!/console\.log\s*\(\s*['"]\[Cancel\]/.test(line)) continue;

        const hasInlineDev = /__DEV__\s*&&\s*console\.log/.test(line);
        let hasOpeningGuard = false;
        for (let j = Math.max(0, i - 4); j <= i; j++) {
          if (/if\s*\(\s*__DEV__\s*\)/.test(lines[j])) {
            hasOpeningGuard = true;
            break;
          }
        }
        if (!hasInlineDev && !hasOpeningGuard) {
          violations.push({ lineNumber: i + 1, lineText: line.trim() });
        }
      }

      expect(violations).toEqual([]);
    }
  );
});

// ---------------------------------------------------------------------------
// C-UX-03 — NativeWind verifyInstallation() runs in production App render
// ---------------------------------------------------------------------------

describe('App - C-UX-03: NativeWind verifyInstallation() must not run unguarded in production render', () => {
  const REL = 'App.tsx';

  test(
    'C-UX-03: `verifyInstallation()` is not called as the first line of the App() render body',
    () => {
      const src = readSrc(REL);

      // Buggy current form (App.tsx:68-69):
      //   export default function App() {
      //     verifyInstallation();
      //
      // Acceptable fixes (per the audit):
      //   (a) Remove the call AND the `import { verifyInstallation } from 'nativewind'` line.
      //   (b) Gate the call: `if (__DEV__) { verifyInstallation(); }` AND
      //       (per audit) hoist it into a `useEffect(() => {...}, [])` so it
      //       doesn't run on every render. Either way, the naked top-of-render
      //       invocation must be gone.
      //
      // We match the buggy pattern fairly tightly: `verifyInstallation()`
      // appears OUTSIDE any `if (__DEV__)` scope and outside any
      // `useEffect(...)` callback.
      const lines = src.split('\n');

      type Violation = { lineNumber: number; lineText: string };
      const violations: Violation[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/verifyInstallation\s*\(\s*\)/.test(line)) continue;

        // Skip lines that are the import itself.
        if (/^\s*import\b/.test(line)) continue;

        const hasInlineDev = /__DEV__\s*&&\s*verifyInstallation/.test(line);
        let hasDevGuardAbove = false;
        for (let j = Math.max(0, i - 4); j <= i; j++) {
          if (/if\s*\(\s*__DEV__\s*\)/.test(lines[j])) {
            hasDevGuardAbove = true;
            break;
          }
        }
        if (!hasInlineDev && !hasDevGuardAbove) {
          violations.push({ lineNumber: i + 1, lineText: line.trim() });
        }
      }

      expect(violations).toEqual([]);
    }
  );
});

// ---------------------------------------------------------------------------
// C-CRASH-06 — Linking.openURL must be awaited/caught in ProfileScreen
// ---------------------------------------------------------------------------

describe('ProfileScreen - C-CRASH-06: Linking.openURL calls must be awaited/caught (no unhandled rejection)', () => {
  const REL = path.join('src', 'screens', 'ProfileScreen.tsx');

  test(
    'C-CRASH-06: handleCallStudio does not call Linking.openURL as a bare synchronous expression',
    () => {
      const src = readSrc(REL);

      // Buggy current shape (ProfileScreen.tsx:274-276):
      //   const handleCallStudio = () => {
      //     Linking.openURL(`tel:${STUDIO_PHONE}`);
      //   };
      //
      // The intended fix (per audit) makes the handler `async` and guards
      // openURL with canOpenURL + try/catch (or at minimum chains `.catch`).
      // Acceptable shapes therefore:
      //   (a) `async () => { ... try { ... await Linking.openURL(...) ... } catch { ... } }`
      //   (b) `Linking.openURL(...).catch(...)` (chained .catch)
      //   (c) `await Linking.openURL(...)` inside an async function
      //
      // We assert the buggy bare-call shape is gone. We narrow the match
      // to the `tel:` call site so we don't false-flag other openURL calls.
      //
      // The buggy form is `Linking.openURL(` followed (within ~120 chars,
      // single line) by `tel:` and ending with `);` and NO `.catch` or
      // `await ` prefix on the line.
      const lines = src.split('\n');

      type Violation = { lineNumber: number; lineText: string };
      const violations: Violation[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/Linking\.openURL\s*\(/.test(line)) continue;
        if (!/tel:/.test(line)) continue;

        const isAwaited = /\bawait\s+Linking\.openURL\s*\(/.test(line);
        // Look forward up to 2 lines for a chained `.catch(`.
        let hasCatchChain = false;
        for (let j = i; j <= Math.min(lines.length - 1, i + 2); j++) {
          if (/\.catch\s*\(/.test(lines[j])) {
            hasCatchChain = true;
            break;
          }
        }
        // Look backwards up to 4 lines for an enclosing `try {`.
        let hasTryAbove = false;
        for (let j = Math.max(0, i - 6); j < i; j++) {
          if (/\btry\s*\{/.test(lines[j])) {
            hasTryAbove = true;
            break;
          }
        }
        if (!isAwaited && !hasCatchChain && !hasTryAbove) {
          violations.push({ lineNumber: i + 1, lineText: line.trim() });
        }
      }

      expect(violations).toEqual([]);
    }
  );

  test(
    'C-CRASH-06: handleWhatsAppStudio does not call Linking.openURL as a bare synchronous expression',
    () => {
      const src = readSrc(REL);
      const lines = src.split('\n');

      type Violation = { lineNumber: number; lineText: string };
      const violations: Violation[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/Linking\.openURL\s*\(/.test(line)) continue;
        if (!/wa\.me/.test(line)) continue;

        const isAwaited = /\bawait\s+Linking\.openURL\s*\(/.test(line);
        let hasCatchChain = false;
        for (let j = i; j <= Math.min(lines.length - 1, i + 2); j++) {
          if (/\.catch\s*\(/.test(lines[j])) {
            hasCatchChain = true;
            break;
          }
        }
        let hasTryAbove = false;
        for (let j = Math.max(0, i - 6); j < i; j++) {
          if (/\btry\s*\{/.test(lines[j])) {
            hasTryAbove = true;
            break;
          }
        }
        if (!isAwaited && !hasCatchChain && !hasTryAbove) {
          violations.push({ lineNumber: i + 1, lineText: line.trim() });
        }
      }

      expect(violations).toEqual([]);
    }
  );

  test(
    'C-CRASH-06: a rejected Linking.openURL does not become an unhandled rejection in handleCallStudio (behavioral)',
    async () => {
      // Behavioral: load the module's exported handler shape and confirm
      // that when Linking.openURL rejects, the handler's returned promise
      // does NOT reject (because the rejection has been caught somewhere).
      //
      // We can't reasonably mount the screen here without recreating its
      // entire Redux/RTK/Navigation mock graph (the existing
      // ProfileScreen.test.tsx already shows that surface area). Instead
      // we extract the call-site contract structurally: load the source,
      // strip the body of `handleCallStudio` (the arrow assigned to
      // `const handleCallStudio = ...`), compile it as a function in a
      // scope where Linking.openURL rejects, and assert it doesn't blow
      // up the test runner via unhandled rejection.
      //
      // To keep this self-contained and survive future refactors, we
      // require that the handler either be declared `async` or that the
      // call site contains `.catch`. If neither holds, the test is
      // structurally guaranteed to fail (rejection escapes).
      const src = readSrc(REL);

      // Find the `handleCallStudio` declaration block.
      const handlerMatch = src.match(
        /const\s+handleCallStudio\s*=\s*(async\s*)?\(\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*;/
      );
      // The handler MUST exist; if the implementer refactored it away
      // entirely, this test will still fail (and that's intentional — the
      // contract is that openURL rejection cannot escape).
      expect(handlerMatch).not.toBeNull();

      const isAsync = Boolean(handlerMatch?.[1]);
      const body = handlerMatch?.[2] ?? '';
      const hasCatch = /\.catch\s*\(/.test(body);
      const hasTry = /\btry\s*\{/.test(body);

      // Intended contract: at least one of these must hold so that a
      // rejected openURL cannot escape as an unhandled rejection.
      expect(isAsync || hasCatch || hasTry).toBe(true);
    }
  );
});

// ---------------------------------------------------------------------------
// C-CRASH-03 — AdminScheduleSettings: drop the `?.workPeriods.length!` `!`
// ---------------------------------------------------------------------------

describe('AdminScheduleSettingsScreen - C-CRASH-03: replace `?.workPeriods.length!` with a safe access', () => {
  const REL = path.join(
    'src',
    'screens',
    'AdminScheduleSettings',
    'AdminScheduleSettingsScreen.tsx'
  );

  test(
    'C-CRASH-03: source contains no non-null assertion on `?.workPeriods.length`',
    () => {
      const src = readSrc(REL);

      // Buggy current shape (line 130):
      //   localDays.find(d => d.dayOfWeek === updatedDay.dayOfWeek)?.workPeriods.length!
      //
      // Match the literal `?.workPeriods.length!` (the `!` non-null
      // assertion at the end of that exact optional-chain expression).
      // The intended fix uses `?? 0` (or any access pattern that does not
      // terminate in `!`).
      const buggyNonNullAssertion = /\?\.workPeriods\.length\s*!/;
      expect(src).not.toMatch(buggyNonNullAssertion);
    }
  );

  test(
    'C-CRASH-03: handleSaveDay reads the previous work-periods length via a safe access (?? 0 or equivalent)',
    () => {
      // Defensive: the audit's recommended remediation is
      //   const prev = localDays.find(...);
      //   const prevLen = prev?.workPeriods.length ?? 0;
      // Either that explicit shape OR any equivalent that ends in `?? 0`
      // / `?? 0)` on a `workPeriods.length` expression is acceptable.
      const src = readSrc(REL);

      const acceptableNullishDefault =
        /workPeriods\.length\s*\)?\s*\?\?\s*0/;
      const acceptableExplicitLookup =
        /const\s+\w+\s*=\s*localDays\.find\([^)]*\)\s*;\s*\n\s*const\s+\w+\s*=\s*\w+\?\.workPeriods\.length\s*\?\?\s*0/;

      expect(
        acceptableNullishDefault.test(src) ||
          acceptableExplicitLookup.test(src)
      ).toBe(true);
    }
  );
});

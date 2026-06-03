// src/screens/Booking/__tests__/BookingWizardScreen.step4ConfirmGuard.test.ts
//
// C-NET-08 (pre-ship audit 2026-06-03)
// ---------------------------------------------------------------------------
// INTENDED BEHAVIOR (pin):
//   In `src/screens/Booking/BookingWizardScreen.tsx`, Step 4 ("تأكيد
//   الحجز") MUST NOT allow the user to confirm a booking while the summary
//   card is blank. Today the Step-4 summary is gated on
//   `selectedSession && selectedDayGroup && selectedBedNumber` (line 509)
//   but `selectedSession` is derived from the now→+14d LIST query
//   (`useGetSessionsQuery`, lines 259-262). When the user deep-links into
//   Step 3/4 via `preselectedSessionId` (Schedule → BookingWizard), and
//   the list query is still loading, errored, or omits the preselected
//   session (e.g. it falls outside the wizard's now→+14d window), then
//   `selectedSession` and `selectedDayGroup` are null and the summary
//   card silently renders nothing — yet the confirm button stays enabled
//   because `handleConfirmBooking` only checks
//   `selectedSessionId && selectedBedNumber` (line 322), and the confirm
//   Pressable's `disabled` prop only checks `isCreating` (line 556). The
//   user can tap "تأكيد الحجز الآن" while staring at an empty summary.
//
//   The fix must:
//     (a) Gate the Step-4 confirm on a RESOLVED session — i.e. the
//         disabled/guard expression must depend on `selectedSession`
//         (the resolved object), or on the detail query's resolved
//         session from `useGetSessionByIdQuery` (preferred — that query
//         is already issued for the bed grid, and its window is the
//         specific session, not the now→+14d list).
//     (b) Render a non-blank Step-4 state when the session isn't yet
//         resolved (a spinner while loading; an error/empty message and
//         disabled confirm if it never resolves).
//
//   The OBSERVABLE contract that this guard pins (source-level):
//     - `handleConfirmBooking` MUST guard against `selectedSession`
//       being null (not just `selectedSessionId`), OR the confirm
//       Pressable's `disabled` prop MUST include the resolved
//       `selectedSession` (or `sessionDetailsData.session`) being null.
//     - The Step-4 summary block MUST NOT silently render nothing when
//       only `selectedSession`/`selectedDayGroup` are null — it must
//       either show a loading/empty fallback or be unreachable because
//       confirm is gated.
//
// WHY A SOURCE-REGEX GUARD HERE
// Driving the deep-link bug behaviorally would require simulating the
// preselectedSessionId-from-Schedule path with a list-query that omits
// the chosen session, then asserting the disabled state of the confirm
// Pressable — which depends on the wizard advancing to Step 4 with a
// non-null `selectedBedNumber` despite the missing list entry. The setup
// is brittle (the wizard uses `useFocusEffect` + `useIsFocused` +
// `useGetSessionByIdQuery` + multiple `useMemo` derivations), and the
// existing BookingWizardScreen tests (CLIENT-1.1, CLIENT-2.11) already
// use source-regex pinning for exactly this reason. The implementer is
// free to convert this to a true rendered test once the new disabled-
// expression / loading state is in place.

import * as fs from 'fs';
import * as path from 'path';

const wizardSourcePath = path.resolve(
  __dirname,
  '..',
  'BookingWizardScreen.tsx'
);

function readSource(): string {
  return fs.readFileSync(wizardSourcePath, 'utf8');
}

describe('C-NET-08 — Step 4 confirm must be disabled (or show loading/empty) when selectedSession is not resolved', () => {
  // Sanity: confirm the file is on disk and still has the Step-4 confirm
  // Pressable + the handleConfirmBooking + the summary card we are
  // guarding. If any of these are renamed, the implementer needs to
  // refresh the regex.
  test('sanity: BookingWizardScreen.tsx still has handleConfirmBooking + Step-4 confirm Pressable + summary card', () => {
    const src = readSource();
    expect(src).toMatch(/handleConfirmBooking/);
    expect(src).toMatch(/تأكيد الحجز الآن/);
    expect(src).toMatch(/BookingSummaryCard/);
  });

  // Intended (guard #1): handleConfirmBooking MUST depend on the
  // RESOLVED `selectedSession` (or the resolved
  // `sessionDetailsData?.session`), not just on the string ids.
  //
  // Today the guard is `if (!selectedSessionId || !selectedBedNumber) return;`
  // which lets through a deep-link where the list-query omits the
  // preselected session. The intended form references either
  // `selectedSession` or `sessionDetailsData` so a null resolved session
  // short-circuits.
  //
  // We accept any of:
  //   if (!selectedSession || !selectedBedNumber) return;
  //   if (!selectedSession || !selectedSessionId || !selectedBedNumber) return;
  //   if (!sessionDetailsData?.session || ...) return;
  // The pin: somewhere INSIDE handleConfirmBooking, the resolved-session
  // identifier must appear in a guard/early-return — not just the id.
  test(
    'C-NET-08: handleConfirmBooking guards on the resolved `selectedSession` (or `sessionDetailsData.session`), not only `selectedSessionId`',
    () => {
      const src = readSource();

      // Carve out the handleConfirmBooking body. The current shape is
      // `const handleConfirmBooking = async () => { ... };` and contains
      // the early-return guard at the top.
      const fnStartIdx = src.indexOf('handleConfirmBooking');
      expect(fnStartIdx).toBeGreaterThan(-1);

      // Take a generous window after the function name. The function
      // body up to the closing `};` of the arrow is well within ~2500
      // chars on the current source (~25 lines). This is intentionally
      // loose so a small refactor doesn't break the guard.
      const fnRegion = src.slice(fnStartIdx, fnStartIdx + 2500);

      // The pin: the guard/early-return must reference the RESOLVED
      // session object (`selectedSession`) or the details-query result
      // (`sessionDetailsData`). A guard that only mentions the string
      // id `selectedSessionId` is the current bug and must not satisfy.
      const guardReferencesResolvedSession =
        /\bselectedSession\b(?!Id)/.test(fnRegion) ||
        /\bsessionDetailsData\b/.test(fnRegion);

      expect(guardReferencesResolvedSession).toBe(true);
    }
  );

  // Intended (guard #2): the Step-4 confirm Pressable's `disabled` prop
  // MUST include the resolved-session condition so the button is greyed
  // out while the summary is blank. Today the disabled prop is purely
  // `disabled={isCreating}` (line 556). The intended form references
  // `selectedSession` (or `sessionDetailsData`) so a null resolved
  // session disables confirm.
  //
  // We accept any disabled expression that mentions the resolved
  // identifier (`!selectedSession`, `!sessionDetailsData`, etc.) inside
  // the same `disabled={...}` prop that today reads `isCreating`. We
  // search for a `disabled={...}` whose body references the resolved
  // identifier, and assert at least one such prop exists in the file.
  test(
    'C-NET-08: the Step-4 confirm Pressable `disabled` prop also gates on the resolved `selectedSession` (or `sessionDetailsData`)',
    () => {
      const src = readSource();

      // Find every `disabled={...}` in the source and check whether any
      // of them references the resolved-session signal. The wizard has
      // exactly two confirm-Pressable disabled props today:
      //   (Step 4) disabled={isCreating}
      //   (Steps 1-3 "next") disabled={!canProceed()}
      // The fix should change the Step-4 one to also gate on the
      // resolved session.
      const disabledExpressions: string[] = [];
      const disabledRegex = /disabled=\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = disabledRegex.exec(src)) !== null) {
        disabledExpressions.push(m[1]);
      }
      expect(disabledExpressions.length).toBeGreaterThan(0);

      // The Step-4 confirm disabled expression today reads `isCreating`.
      // We pin: at least ONE disabled expression that mentions
      // `isCreating` must ALSO mention the resolved session identifier
      // (selectedSession w/o the `Id` suffix, or sessionDetailsData).
      //
      // We allow the implementer to refactor canProceed() to fold in
      // the resolved-session check — in which case `disabled={!canProceed()}`
      // would gate Step 4 too, and canProceed's case-4 body would
      // contain the resolved-session reference. We tolerate that
      // alternative by ALSO checking the Step-4 branch of canProceed().
      const step4ConfirmDisabledOk = disabledExpressions.some(
        (expr) =>
          /\bisCreating\b/.test(expr) &&
          (/\bselectedSession\b(?!Id)/.test(expr) ||
            /\bsessionDetailsData\b/.test(expr))
      );

      // Alternative: the implementer routed Step-4's disabled through
      // !canProceed() and case 4 of canProceed now references the
      // resolved-session signal.
      const canProceedCase4Match = src.match(
        /case\s*4\s*:\s*return\s+([^;]+);/
      );
      const canProceedCase4ReferencesResolved = canProceedCase4Match
        ? /\bselectedSession\b(?!Id)/.test(canProceedCase4Match[1]) ||
          /\bsessionDetailsData\b/.test(canProceedCase4Match[1])
        : false;

      expect(step4ConfirmDisabledOk || canProceedCase4ReferencesResolved).toBe(
        true
      );
    }
  );
});

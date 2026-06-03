// src/screens/Admin/__tests__/AdminCustomerDetailsScreen.editGuard.test.tsx
//
// Bugs-Policy regression guards for the admin-screen robustness polish:
//
//   C-NET-04 — AdminCustomerDetailsScreen edit form is silently overwritten
//   by a background refetch (focus / AppState 'active') while the admin is
//   mid-edit. A single useEffect (lines ~121-135) resyncs EVERY form field
//   (firstName/lastName/phone/age/weight/healthStatus/adminNotes/
//   subscription.status/endDate) from `data` whenever `data` changes. The
//   screen also refetches on focus and on app foreground via
//   `asyncGuardedRefetch` (lines ~149-160). When a background refetch
//   resolves while the admin is mid-edit (e.g. they tab away to copy a
//   phone number and return), the resolved `data` triggers the resync and
//   overwrites the admin's typed-but-unsaved changes.
//
// Source: connevia/.claude/PRESHIP_AUDIT_2026-06-03.md (C-NET-04).
// Buggy spot: AdminCustomerDetailsScreen.tsx lines 121-135 (single resync
// effect with no isEditing guard) + lines 149-160 (focus/AppState refetch).
//
// INTENDED CONTRACT (per the brief):
//   While the admin is actively editing a customer-detail field, the
//   server->local sync must NOT overwrite their in-progress edits. Guard
//   the resync with an isEditing/dirty flag. Acceptable shapes:
//     (a) Single effect, early-return if ANY isEditing* flag is true:
//         useEffect(() => {
//           if (isEditingPersonal || isEditingHealth ||
//               isEditingNotes || isEditingSubscription) return;
//           if (data) { setFirstName(...); ... }
//         }, [data, isEditingPersonal, isEditingHealth,
//             isEditingNotes, isEditingSubscription]);
//     (b) Split into per-card effects, each guarded by its own isEditingX:
//         useEffect(() => {
//           if (isEditingPersonal) return;
//           if (data) { setFirstName(...); ... }
//         }, [data, isEditingPersonal]);
//         ... and similarly for health / notes / subscription.
//     (c) Refs / dirty flags equivalent to (a)/(b).
//
// Test strategy: SOURCE-REGEX, matching the precedent in
// AdminScheduleScreen.polish.test.ts. Behaviorally rendering this screen
// requires stubbing 4 RTK mutation hooks + 1 query hook, the Subscription
// status modal, ToastMessage, the LinearGradient header, useFocusEffect,
// AppState, navigation, and useRoute params — Phase 2.5 territory. The
// source-regex precedent is established and gives us a durable contract.
//
// Status: FIXED 2026-06-03 — the resync effect is now guarded by isEditing
// flags in AdminCustomerDetailsScreen.tsx and the source-regex guards below
// hold. Tests are kept as durable regression guards (no `.failing`).

import * as fs from 'fs';
import * as path from 'path';

const SRC_PATH = path.join(
  __dirname,
  '..',
  'AdminCustomerDetailsScreen.tsx'
);
const readSrc = (): string => fs.readFileSync(SRC_PATH, 'utf8');

describe('AdminCustomerDetailsScreen — C-NET-04: resync effect clobbers in-progress edits', () => {
  test(
    'C-NET-04: the data->local resync effect is guarded by at least one isEditing flag',
    () => {
      const src = readSrc();

      // Locate the resync effect — the one that initializes form state from
      // `data`. It calls setFirstName, setLastName, setPhone, ...
      // Today (buggy): `useEffect(() => { if (data) { setFirstName(...);
      // ... } }, [data]);` with NO isEditing guard.
      //
      // We isolate the effect block by matching the multiline form
      //   useEffect(() => { ... if (data) { setFirstName(...) ... } ... }, [...])
      // and look for at least one `isEditing*` early-return or guard inside.
      //
      // Acceptable shapes:
      //   (a) `if (isEditingPersonal || isEditingHealth || ...) return;`
      //   (b) `if (!data || isEditing...) return;`
      //   (c) Per-card effects where each calls setFirstName/setAge/etc.
      //       under its own `if (isEditingX) return;` guard.
      //
      // We assert that the file contains AT LEAST ONE `isEditing` reference
      // inside a useEffect whose body also calls one of the resync setters
      // (setFirstName / setAge / setAdminNotes / setSubStatus).

      // Strategy: enumerate every useEffect block and test each one. The
      // resync effect is identifiable by its setter calls. If any such
      // effect lacks an `isEditing` guard, the test fails.
      const effectBlocks: string[] = [];
      const effectRegex =
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[\s\S]*?\]\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = effectRegex.exec(src)) !== null) {
        effectBlocks.push(m[0]);
      }
      expect(effectBlocks.length).toBeGreaterThan(0);

      const RESYNC_SETTERS =
        /setFirstName|setLastName|setPhone|setAge|setWeight|setHealthStatus|setAdminNotes|setSubStatus|setSubEndDate/;

      const resyncEffects = effectBlocks.filter((b) => RESYNC_SETTERS.test(b));
      expect(resyncEffects.length).toBeGreaterThan(0);

      // EVERY effect that calls a resync setter must reference at least one
      // isEditing flag. (Shape (a) has 1 effect containing all setters +
      // a guard; shape (b) has N per-card effects each guarded by its own
      // isEditingX.)
      const unguarded = resyncEffects.filter(
        (b) =>
          !/isEditingPersonal|isEditingHealth|isEditingNotes|isEditingSubscription/.test(
            b
          )
      );
      expect(unguarded).toEqual([]);
    }
  );

  test(
    'C-NET-04: each resync effect early-returns or skips setState when its isEditing flag is true',
    () => {
      const src = readSrc();

      // Stronger contract: the guard must take the form of an early return
      // (or an equivalent skip) so the setState never runs while editing.
      // We pin the canonical shapes:
      //   (a) `if (...isEditing...) return;` inside the effect body.
      //   (b) `if (data && !isEditing...) { setFirstName(...); ... }`
      //       (positive-guard variant).
      //
      // We locate the resync effect(s) (same logic as the previous test)
      // and assert at least one of those forms appears in each.

      const effectBlocks: string[] = [];
      const effectRegex =
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[\s\S]*?\]\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = effectRegex.exec(src)) !== null) {
        effectBlocks.push(m[0]);
      }

      const RESYNC_SETTERS =
        /setFirstName|setLastName|setPhone|setAge|setWeight|setHealthStatus|setAdminNotes|setSubStatus|setSubEndDate/;
      const resyncEffects = effectBlocks.filter((b) => RESYNC_SETTERS.test(b));

      const earlyReturnGuard =
        /if\s*\([^)]*isEditing(Personal|Health|Notes|Subscription)[^)]*\)\s*\{?\s*return/;
      const positiveGuard =
        /if\s*\(\s*data\s*&&\s*!\s*isEditing(Personal|Health|Notes|Subscription)/;

      const guarded = resyncEffects.filter(
        (b) => earlyReturnGuard.test(b) || positiveGuard.test(b)
      );

      // At least one resync effect must show a guard. (Per-card shape:
      // ALL resync effects must show their own guard, which we cover in
      // the previous test by forbidding any unguarded resync effect.)
      expect(guarded.length).toBeGreaterThan(0);
    }
  );

  test(
    'C-NET-04: the resync effect dependency array includes the relevant isEditing flags',
    () => {
      const src = readSrc();

      // If shape (a) is used (single effect, OR-of-flags guard), the dep
      // array must include the flags so React re-evaluates the guard when
      // the admin toggles edit mode. If shape (b) is used (per-card
      // effects), each effect's dep array must include its own flag.
      //
      // We allow either by asserting that AT LEAST ONE useEffect referencing
      // a resync setter ALSO has an isEditing flag in its dependency array.

      const effectBlocks: string[] = [];
      const effectRegex =
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[([\s\S]*?)\]\s*\)/g;
      let m: RegExpExecArray | null;
      const effectsWithDeps: { body: string; deps: string }[] = [];
      while ((m = effectRegex.exec(src)) !== null) {
        effectsWithDeps.push({ body: m[0], deps: m[1] });
      }

      const RESYNC_SETTERS =
        /setFirstName|setLastName|setPhone|setAge|setWeight|setHealthStatus|setAdminNotes|setSubStatus|setSubEndDate/;
      const ISEDITING_DEP =
        /isEditingPersonal|isEditingHealth|isEditingNotes|isEditingSubscription/;

      const resyncWithIsEditingDep = effectsWithDeps.filter(
        (e) => RESYNC_SETTERS.test(e.body) && ISEDITING_DEP.test(e.deps)
      );

      expect(resyncWithIsEditingDep.length).toBeGreaterThan(0);
    }
  );

  test(
    'C-NET-04: the buggy unguarded "useEffect with only [data] deps that calls setFirstName" pattern is gone',
    () => {
      const src = readSrc();

      // Pin the specific buggy current shape so the test fails for the
      // RIGHT reason. The effect today is:
      //
      //   useEffect(() => {
      //     if (data) {
      //       setFirstName(data.personal.firstName || '');
      //       ...
      //     }
      //   }, [data]);
      //
      // The fix either (a) adds isEditing flags to the deps and adds a guard
      // inside, or (b) splits into multiple per-card effects each with its
      // own isEditing guard. Either way, an effect with EXACTLY [data] as
      // dep array AND that contains setFirstName / setAge / setAdminNotes
      // / setSubStatus is the buggy shape and must be gone.
      const buggyShape =
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?(setFirstName|setAge|setAdminNotes|setSubStatus)[\s\S]*?\}\s*,\s*\[\s*data\s*\]\s*\)/;

      expect(src).not.toMatch(buggyShape);
    }
  );
});

// Behavioral contract sanity — a pure-JS simulation of the intended logic.
// Documents what the implementer must produce; does NOT mount the screen.
describe('AdminCustomerDetailsScreen — C-NET-04: intended edit-vs-refetch semantics (pure-logic spec)', () => {
  test('CONTRACT spec (always green): mid-edit field is NOT overwritten by a background refetch', () => {
    // Simulated state slice for one card (personal).
    let firstName = 'Sara';
    const setFirstName = (v: string) => {
      firstName = v;
    };

    let isEditingPersonal = false;

    // Server returns initial data; resync runs and seeds the field.
    let data: { personal: { firstName: string } } | null = {
      personal: { firstName: 'Sara' },
    };

    const resyncIfNotEditing = () => {
      if (isEditingPersonal) return; // intended guard
      if (data) setFirstName(data.personal.firstName);
    };

    resyncIfNotEditing();
    expect(firstName).toBe('Sara');

    // Admin enters edit mode and types a change.
    isEditingPersonal = true;
    setFirstName('SaraEditedButNotSaved');

    // Background refetch resolves with the (older) server value.
    data = { personal: { firstName: 'Sara' } };

    // Intended behavior: the resync MUST NOT clobber the in-progress edit.
    resyncIfNotEditing();
    expect(firstName).toBe('SaraEditedButNotSaved');

    // Once the admin cancels/saves and exits edit mode, the next resync may
    // re-sync from data (this is the existing handleCancelPersonal flow).
    isEditingPersonal = false;
    resyncIfNotEditing();
    expect(firstName).toBe('Sara');
  });
});

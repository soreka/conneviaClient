// src/screens/AdminScheduleSettings/__tests__/AdminScheduleSettingsScreen.optimisticRollback.test.tsx
//
// Bugs-Policy regression guards for the admin-screen robustness polish:
//
//   C-NET-02 — Admin "save day hours" optimistic update has NO rollback on
//   mutation failure -> local schedule state diverges from server until
//   reload. `handleSaveDay` optimistically calls setLocalDays(newDays) at
//   line ~124 then awaits updateSettings(...).unwrap(). The catch block
//   at lines 143-149 only shows an error toast — it does NOT revert
//   localDays to the prior value. Contrast handleToggleDay (line ~96-97),
//   which DOES `setLocalDays(localDays)` on error.
//
// Source: connevia/.claude/PRESHIP_AUDIT_2026-06-03.md (C-NET-02).
// Buggy spot: AdminScheduleSettingsScreen.tsx ~lines 120-150 (handleSaveDay).
//
// INTENDED CONTRACT (per the brief):
//   handleSaveDay must capture the PRE-update snapshot BEFORE setLocalDays,
//   and on mutation failure roll back via setLocalDays(prevDays). E.g.
//     const prevDays = localDays;            // capture FIRST
//     const newDays = localDays.map(...);
//     setLocalDays(newDays);                  // optimistic
//     try { await updateSettings({ days: newDays }).unwrap(); }
//     catch (err) {
//       setLocalDays(prevDays);               // rollback to PRE-update
//       Toast.show(...);
//     }
//
//   The brief specifically forbids the "settingsData?.days ?? localDays"
//   re-capture pattern as the canonical fix: it captures the POST-optimistic
//   value of localDays at catch time, which is exactly the divergent state
//   we are trying to revert. The pre-update snapshot is the correct source.
//
// Test strategy: SOURCE-REGEX, matching the precedent in
// AdminScheduleScreen.polish.test.ts. Behaviorally rendering this screen
// would require mocking 5+ subcomponents (DayHoursModal, DaySettingsCard,
// AutoGenerateSection, AdminScheduleHeader, ScheduleSettingsSkeleton),
// stubbing 3 RTK hooks, and driving an Animated.stagger entry sequence —
// which is precisely the Phase 2.5 admin-screen render infra not yet built.
// The source-regex approach is precedent-supported (AdminScheduleScreen
// polish suite) and gives us a durable, behavior-pinning contract.
//
// Status: FIXED 2026-06-03 — the pre-update snapshot + catch-block rollback
// now exist in AdminScheduleSettingsScreen.tsx and the source-regex guards
// below hold. Tests are kept as durable regression guards (no `.failing`).

import * as fs from 'fs';
import * as path from 'path';

const SRC_PATH = path.join(
  __dirname,
  '..',
  'AdminScheduleSettingsScreen.tsx'
);
const readSrc = (): string => fs.readFileSync(SRC_PATH, 'utf8');

describe('AdminScheduleSettingsScreen — C-NET-02: handleSaveDay optimistic update has no rollback', () => {
  test(
    'C-NET-02: handleSaveDay captures a PRE-update snapshot of localDays before the optimistic setLocalDays',
    () => {
      const src = readSrc();

      // Isolate the handleSaveDay function body — the bug AND the fix both
      // live in this function. We grab from the function signature down to
      // its closing brace (best-effort multiline; the function is ~30 lines).
      const handleSaveDayMatch = src.match(
        /const\s+handleSaveDay\s*=\s*async\s*\([\s\S]*?\n\s*\}\s*;\s*\n/
      );
      expect(handleSaveDayMatch).not.toBeNull();
      const body = handleSaveDayMatch![0];

      // Acceptable shapes for the pre-update snapshot capture (ordering
      // matters: the snapshot MUST be taken BEFORE setLocalDays(newDays)):
      //   (a) `const prevDays = localDays;` somewhere above setLocalDays.
      //   (b) `const previousDays = localDays;`
      //   (c) `const snapshot = localDays;`
      // We accept the common variable names.
      const snapshotPattern =
        /const\s+(prevDays|previousDays|snapshot|prevLocalDays)\s*=\s*localDays\s*;/;
      const snapshotMatch = body.match(snapshotPattern);
      expect(snapshotMatch).not.toBeNull();

      // Ordering check — the snapshot capture must appear BEFORE the
      // `setLocalDays(newDays)` optimistic update line. (The buggy code
      // calls setLocalDays(newDays) with no preceding snapshot capture.)
      const snapshotIdx = body.indexOf(snapshotMatch![0]);
      const optimisticIdx = body.search(/setLocalDays\s*\(\s*newDays\s*\)/);
      expect(optimisticIdx).toBeGreaterThan(-1);
      expect(snapshotIdx).toBeGreaterThan(-1);
      expect(snapshotIdx).toBeLessThan(optimisticIdx);
    }
  );

  test(
    'C-NET-02: handleSaveDay catch block rolls back localDays to the pre-update snapshot',
    () => {
      const src = readSrc();

      const handleSaveDayMatch = src.match(
        /const\s+handleSaveDay\s*=\s*async\s*\([\s\S]*?\n\s*\}\s*;\s*\n/
      );
      expect(handleSaveDayMatch).not.toBeNull();
      const body = handleSaveDayMatch![0];

      // Find the catch block within handleSaveDay.
      const catchMatch = body.match(/catch\s*\([\s\S]*?\}\s*$/m);
      expect(catchMatch).not.toBeNull();
      const catchBody = catchMatch![0];

      // The catch MUST call setLocalDays with the pre-update snapshot
      // variable (NOT with settingsData?.days, NOT with localDays itself
      // — see the brief: the snapshot is the correct source).
      const rollbackPattern =
        /setLocalDays\s*\(\s*(prevDays|previousDays|snapshot|prevLocalDays)\s*\)/;
      const rollbackMatch = catchBody.match(rollbackPattern);

      expect(rollbackMatch).not.toBeNull();
    }
  );

  test(
    'C-NET-02: handleSaveDay catch block does NOT leave localDays at the optimistic value (no error-only-toast pattern)',
    () => {
      const src = readSrc();

      const handleSaveDayMatch = src.match(
        /const\s+handleSaveDay\s*=\s*async\s*\([\s\S]*?\n\s*\}\s*;\s*\n/
      );
      expect(handleSaveDayMatch).not.toBeNull();
      const body = handleSaveDayMatch![0];

      // Pin the buggy current shape: a catch block that contains ONLY a
      // Toast.show call with no setLocalDays rollback. If this pattern
      // still matches, the bug is still present.
      const buggyCatch =
        /catch\s*\([\s\S]*?\)\s*\{\s*Toast\.show\s*\(\s*\{[\s\S]*?type:\s*['"]error['"][\s\S]*?\}\s*\)\s*;\s*\}/;

      // Negative assertion: the buggy "catch -> toast only" shape must be
      // gone. The fix replaces it with "catch -> setLocalDays(prevDays);
      // Toast.show(...)" (or the reverse order).
      const matched = body.match(buggyCatch);
      // If matched is non-null, every captured catch is "toast only" with
      // no setLocalDays — that's the bug. The fix removes the toast-only
      // shape by introducing a setLocalDays call in the same block.
      expect(matched).toBeNull();
    }
  );

  test(
    'C-NET-02: handleToggleDay continues to roll back on error (parity with the fixed handleSaveDay)',
    () => {
      const src = readSrc();

      // Defense in depth: handleToggleDay already rolls back today
      // (line 97 sets `setLocalDays(localDays)`). The fix to handleSaveDay
      // must not regress this. The brief's preferred shape is a pre-update
      // snapshot for BOTH handlers (the toggle handler today does
      // `setLocalDays(localDays)` in catch, which captures the
      // POST-optimistic value at catch time — same anti-pattern the brief
      // calls out for handleSaveDay).
      //
      // To stay aligned with the brief's intended contract everywhere,
      // handleToggleDay should ALSO take a pre-update snapshot. This test
      // pins that parity: both handlers capture a snapshot before the
      // optimistic update and revert to it on error.
      const handleToggleMatch = src.match(
        /const\s+handleToggleDay\s*=\s*async\s*\([\s\S]*?\n\s*\}\s*;\s*\n/
      );
      expect(handleToggleMatch).not.toBeNull();
      const body = handleToggleMatch![0];

      const snapshotPattern =
        /const\s+(prevDays|previousDays|snapshot|prevLocalDays)\s*=\s*localDays\s*;/;
      const snapshotMatch = body.match(snapshotPattern);
      expect(snapshotMatch).not.toBeNull();

      // Ordering: snapshot before setLocalDays(newDays).
      const snapshotIdx = body.indexOf(snapshotMatch![0]);
      const optimisticIdx = body.search(/setLocalDays\s*\(\s*newDays\s*\)/);
      expect(optimisticIdx).toBeGreaterThan(-1);
      expect(snapshotIdx).toBeGreaterThan(-1);
      expect(snapshotIdx).toBeLessThan(optimisticIdx);

      // Catch must revert to the snapshot, not re-reference `localDays` (the
      // post-optimistic value).
      const catchMatch = body.match(/catch\s*\([\s\S]*?\}\s*$/m);
      expect(catchMatch).not.toBeNull();
      const catchBody = catchMatch![0];

      const rollbackPattern =
        /setLocalDays\s*\(\s*(prevDays|previousDays|snapshot|prevLocalDays)\s*\)/;
      expect(catchBody.match(rollbackPattern)).not.toBeNull();
    }
  );
});

// Behavioral contract sanity — a pure-JS simulation of the intended logic.
// This documents what the implementer must produce and makes the test fail
// loudly if the simulator itself is wrong. It DOES NOT mount the screen.
describe('AdminScheduleSettingsScreen — C-NET-02: intended rollback semantics (pure-logic spec)', () => {
  test('CONTRACT spec (always green): pre-update snapshot, optimistic update, revert on failure', async () => {
    const initial = [
      { dayOfWeek: 0, enabled: true, workPeriods: [{ from: '09:00', to: '10:00' }] },
      { dayOfWeek: 1, enabled: true, workPeriods: [{ from: '10:00', to: '11:00' }] },
    ];

    let localDays = initial;

    const update = jest.fn().mockRejectedValueOnce(new Error('boom'));

    // Intended handleSaveDay logic:
    const updatedDay = {
      dayOfWeek: 0,
      enabled: true,
      workPeriods: [{ from: '08:00', to: '12:00' }], // NEW hours
    };
    const prevDays = localDays; // capture FIRST
    const newDays = localDays.map((d) =>
      d.dayOfWeek === updatedDay.dayOfWeek ? updatedDay : d
    );
    localDays = newDays; // optimistic
    try {
      await update({ days: newDays });
    } catch {
      localDays = prevDays; // rollback to PRE-update
    }

    // After failure, local state must equal the pre-update server-truth
    // snapshot — NOT the optimistic value.
    expect(localDays).toBe(prevDays);
    expect(localDays).toEqual(initial);
    expect(localDays[0].workPeriods[0].from).toBe('09:00'); // not '08:00'
    expect(update).toHaveBeenCalledTimes(1);
  });
});

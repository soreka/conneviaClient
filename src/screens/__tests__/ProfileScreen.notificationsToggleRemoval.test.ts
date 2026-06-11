// src/screens/__tests__/ProfileScreen.notificationsToggleRemoval.test.ts
//
// C-STORE-06 — the Notifications toggle in the Profile "Account Settings" card
// is a DEAD control: it is backed by a pure-local `notificationsEnabled`
// useState (defaults true, never persisted, never wired to expo-notifications
// or any push system). Toggling it does nothing and the value resets on every
// remount. Apple guideline 2.1 (app completeness) can flag a non-functional
// control as a "broken feature"; it is also a user-trust defect (users think
// they disabled notifications when nothing happens).
//
// Decision (per .claude/PRESHIP_AUDIT_2026-06-03.md C-STORE-06): REMOVE the
// row until a real push feature exists — hiding is the lower-risk pre-launch
// choice. The implementer will delete the row + its local state.
//
// INTENDED CONTRACT (post-removal):
//   - ProfileScreen.tsx no longer declares `notificationsEnabled` /
//     `setNotificationsEnabled` local state.
//   - The "الإشعارات" (Notifications) row + its <Switch> bound to
//     `notificationsEnabled` are gone from the Account Settings card.
//
// WHY SOURCE-REGEX HERE
// ProfileScreen is a 770-LOC screen that pulls in ~6 RTK Query hooks, Auth0
// `useAuth`, navigation, image-picker, and a half-dozen sub-cards; a full
// behavioral render to assert the ABSENCE of one row is heavy and brittle
// (and the existing ProfileScreen.test.tsx already owns the behavioral
// surface). A source-guard is precedent-supported here (cf.
// AdminScheduleSettingsScreen.optimisticRollback.test.tsx) and gives a
// durable, unambiguous contract for "the dead toggle is gone".
//
// `test.failing` per the Bugs Policy: TODAY the source still declares
// `notificationsEnabled` and renders the الإشعارات Switch row, so each
// assertion throws. When the implementer removes the row + state and the
// bodies stop throwing, Jest reports "Failing test passed" → the tester drops
// `.failing`.
//
// NOTE (checked 2026-06-11): no existing test references `notificationsEnabled`,
// `الإشعارات`, or the notifications Switch — so removing the row keeps the
// suite green with no other test edits needed.

import * as fs from 'fs';
import * as path from 'path';

const SRC_PATH = path.join(
  __dirname,
  '..',
  'ProfileScreen.tsx'
);
const readSrc = (): string => fs.readFileSync(SRC_PATH, 'utf8');

describe('ProfileScreen — C-STORE-06: dead notifications toggle removed', () => {
  // SANITY ANCHOR: the file exists and is the Profile screen. Keeps the
  // source-guards honest if the file is ever moved/renamed.
  test('sanity: ProfileScreen source loads and is the Account Settings screen', () => {
    const src = readSrc();
    expect(src.length).toBeGreaterThan(0);
    // 'إعدادات الحساب' = "Account Settings" card heading — the card that hosts
    // (today) the dead toggle. Anchors that we are guarding the right file.
    expect(src.includes('إعدادات الحساب')).toBe(true);
  });

  test.failing(
    'C-STORE-06: ProfileScreen declares no notificationsEnabled / setNotificationsEnabled local state',
    () => {
      const src = readSrc();
      // The dead toggle's state must be gone. Matches `notificationsEnabled`
      // and the setter `setNotificationsEnabled` anywhere in the file.
      expect(/notificationsEnabled/.test(src)).toBe(false);
      expect(/setNotificationsEnabled/.test(src)).toBe(false);
    }
  );

  test.failing(
    'C-STORE-06: the الإشعارات (Notifications) Switch row is gone from the Account Settings card',
    () => {
      const src = readSrc();
      // The row label. Once the row is removed there is no notifications
      // affordance in Profile at all.
      expect(/الإشعارات/.test(src)).toBe(false);
      // And there is no <Switch> bound to the dead notifications state.
      const notifSwitch =
        /<Switch[\s\S]*?value=\{\s*notificationsEnabled\s*\}[\s\S]*?\/>/;
      expect(notifSwitch.test(src)).toBe(false);
    }
  );
});

// src/__tests__/keyboardAvoidancePolish.test.ts
//
// Failing regression guards for the 2026-06-03 client keyboard-avoidance
// polish batch (`PRESHIP_AUDIT_2026-06-03.md`):
//
//   - C-UX-06 — CompleteProfileWizard nests its `KeyboardAvoidingView`
//     INSIDE the implicit ScrollView (the wizard uses `<Screen scroll …>`
//     which renders a ScrollView, then puts a `KeyboardAvoidingView` as a
//     child of that ScrollView at lines 169-181). A KAV inside a ScrollView
//     is a no-op for keyboard avoidance — the ScrollView is what the
//     keyboard pushes against. The screen also uses the web-only
//     `min-h-screen` Tailwind class at line 181, which has no effect on
//     React Native (NativeWind does not translate it; "screen" means the
//     browser viewport). Net effect: on the FIRST onboarding step (the
//     wizard a brand-new user lands on after Auth0 signup), the keyboard
//     hides the inputs and the "التالي" submit button on smaller phones.
//
//     INTENDED CONTRACT (per audit C-UX-06):
//       (a) `KeyboardAvoidingView` wraps the scrollable form at the TOP
//           LEVEL — i.e. it appears OUTSIDE the ScrollView, not nested
//           inside it. The behavior prop uses `Platform.OS === 'ios' ?
//           'padding' : undefined`.
//       (b) The screen no longer uses the web-only `min-h-screen` class.
//       (c) The scrollable surface (the ScrollView, or the `<Screen scroll>`
//           passthrough that renders it) uses `keyboardShouldPersistTaps=
//           "handled"` so taps on the submit button while the keyboard is
//           open don't get swallowed by the dismiss handler.
//
//   - C-UX-07 — AdminCustomerDetailsScreen has 9 editable TextInputs (per
//     `Grep TextInput` count), including a multi-line health-notes field,
//     hosted inside a top-level ScrollView (`<ScrollView …>` at line 392)
//     with NO `KeyboardAvoidingView` anywhere in the file. On smaller
//     phones the keyboard hides the input the admin is editing and the
//     save button at the bottom of the edit card.
//
//     INTENDED CONTRACT (per audit C-UX-07):
//       (a) The file contains a `KeyboardAvoidingView` wrapping the
//           editable content (behavior `Platform.OS === 'ios' ? 'padding'
//           : undefined`).
//       (b) The ScrollView uses `keyboardShouldPersistTaps="handled"`.
//
// Test style: SOURCE-REGEX guards. Rendering CompleteProfileWizard +
// AdminCustomerDetailsScreen with the full mock graph required to assert
// "the KAV is structurally above the ScrollView" is impractical here
// (admin screens are Phase 2.5, scoped out of Phase 2). We use the
// established source-regex precedent from
// `src/__tests__/logHygieneAndCrashSafety.test.ts` and
// `src/screens/Admin/__tests__/AdminScheduleScreen.polish.test.ts`.
//
// Each test is a `test.failing(...)` — the assertion encodes the intended
// (fixed) shape, so it FAILS against the current buggy source and will
// start PASSING (and require the tester to drop `.failing`) once the
// implementer lands the fix.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}

// ---------------------------------------------------------------------------
// C-UX-06 — CompleteProfileWizard: KAV must wrap (not be wrapped by)
// the ScrollView, and `min-h-screen` must be gone.
// ---------------------------------------------------------------------------

describe('CompleteProfileWizard - C-UX-06: KAV must wrap the ScrollView, drop web-only min-h-screen', () => {
  const REL = path.join('src', 'screens', 'CompleteProfileWizard.tsx');

  test(
    'C-UX-06: KeyboardAvoidingView is the TOP-LEVEL wrapper (appears outside, not inside, the Screen/ScrollView)',
    () => {
      const src = readSrc(REL);

      // Find the first `<KeyboardAvoidingView` JSX opener (not the import).
      // We accept either the bare tag or with leading whitespace.
      const kavOpenRe = /<KeyboardAvoidingView\b/;
      const kavMatch = src.match(kavOpenRe);
      // The KAV must exist at all (sanity: it was already present in the
      // buggy version too, just nested in the wrong place).
      expect(kavMatch).not.toBeNull();

      const kavIndex = src.indexOf('<KeyboardAvoidingView');

      // The implicit ScrollView is rendered by the `<Screen scroll …>`
      // component (see src/components/UI/Screen.tsx — when `scroll` is
      // truthy it returns `<ScrollView …>{children}</ScrollView>`). So the
      // structural question "is KAV outside the ScrollView?" reduces to
      // "does the FIRST <KeyboardAvoidingView opener appear BEFORE the
      // FIRST <Screen … opener?".
      //
      // Acceptable fixed shape A — the KAV becomes the outermost wrapper:
      //   return (
      //     <KeyboardAvoidingView behavior={…} style={{flex:1}}>
      //       <Screen scroll …>
      //         …
      //       </Screen>
      //     </KeyboardAvoidingView>
      //   );
      //
      // Acceptable fixed shape B — the wizard drops `<Screen scroll>` for a
      // bare `<SafeAreaView>` + explicit `<ScrollView>` and wraps the
      // ScrollView with KAV:
      //   return (
      //     <KeyboardAvoidingView …>
      //       <ScrollView keyboardShouldPersistTaps="handled" …>
      //         …
      //       </ScrollView>
      //     </KeyboardAvoidingView>
      //   );
      //
      // In BOTH acceptable shapes the FIRST KAV opener appears textually
      // BEFORE the first Screen/ScrollView opener. The buggy shape has it
      // the other way around (Screen on line 169, KAV on line 170).
      const screenOpenIdx = src.search(/<Screen\b/);
      const scrollOpenIdx = src.search(/<ScrollView\b/);

      // Use whichever scrolling wrapper exists. (If both are absent the
      // file no longer scrolls, which would itself be a regression — but
      // we still want the KAV to be present and structural; assert that
      // case separately by failing here too.)
      const firstScrollWrapperIdx = [screenOpenIdx, scrollOpenIdx]
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)[0];

      expect(firstScrollWrapperIdx).toBeGreaterThanOrEqual(0);
      // The fix invariant: KAV opener is positioned before the first
      // scroll-wrapper opener.
      expect(kavIndex).toBeLessThan(firstScrollWrapperIdx as number);
    }
  );

  test(
    'C-UX-06: `min-h-screen` (web-only Tailwind class) is removed from CompleteProfileWizard',
    () => {
      const src = readSrc(REL);
      // Web-only Tailwind class; NativeWind does not translate it (there
      // is no concept of viewport-height "screen" on RN). The audit asks
      // for it to be dropped.
      expect(src).not.toMatch(/\bmin-h-screen\b/);
    }
  );

  test(
    'C-UX-06: the wizard scroll surface uses `keyboardShouldPersistTaps="handled"`',
    () => {
      const src = readSrc(REL);
      // Either the file gains an explicit `<ScrollView
      // keyboardShouldPersistTaps="handled">` (acceptable shape B), or it
      // forwards the prop through `<Screen scroll …>` (acceptable shape
      // A would require Screen to accept and forward the prop — also
      // fine; we just check the literal appears somewhere in the source
      // so that the submit button stays tappable while the keyboard is
      // up).
      expect(src).toMatch(/keyboardShouldPersistTaps\s*=\s*["']handled["']/);
    }
  );
});

// ---------------------------------------------------------------------------
// C-UX-07 — AdminCustomerDetailsScreen: editable form must be wrapped in
// a KeyboardAvoidingView; ScrollView gets keyboardShouldPersistTaps.
// ---------------------------------------------------------------------------

describe('AdminCustomerDetailsScreen - C-UX-07: wrap editable form in KeyboardAvoidingView', () => {
  const REL = path.join(
    'src',
    'screens',
    'Admin',
    'AdminCustomerDetailsScreen.tsx'
  );

  test(
    'C-UX-07: AdminCustomerDetailsScreen imports and uses `KeyboardAvoidingView`',
    () => {
      const src = readSrc(REL);

      // The fix requires (a) the import from react-native and (b) at
      // least one JSX usage wrapping the editable content. We check both
      // as a single composite assertion so the failure message is clear.
      const hasImport = /\bKeyboardAvoidingView\b[\s\S]*?from\s+['"]react-native['"]/.test(
        src
      ) || /from\s+['"]react-native['"][\s\S]*?\bKeyboardAvoidingView\b/.test(src);

      const hasJsxUsage = /<KeyboardAvoidingView\b/.test(src);

      // Both must hold. The current source has neither (verified via
      // `Grep KeyboardAvoidingView` on the file: no matches).
      expect(hasImport && hasJsxUsage).toBe(true);
    }
  );

  test(
    'C-UX-07: AdminCustomerDetailsScreen ScrollView uses `keyboardShouldPersistTaps="handled"`',
    () => {
      const src = readSrc(REL);

      // The audit's intended contract is that the ScrollView at line ~392
      // (the only ScrollView in the file) gains
      // `keyboardShouldPersistTaps="handled"` so taps on the save button
      // while the keyboard is open are not swallowed by a dismiss.
      //
      // We assert the literal prop appears in the source. Source-regex is
      // the right shape here because we're asserting a structural prop on
      // a screen whose full render graph (RTK Query hook + navigation +
      // SafeArea + AppState + useFocusEffect + modal) is Phase 2.5 / not
      // yet mounted in tests.
      expect(src).toMatch(/keyboardShouldPersistTaps\s*=\s*["']handled["']/);
    }
  );
});

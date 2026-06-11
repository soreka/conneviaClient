// src/screens/Booking/__tests__/BookingWizardScreen.step3Padding.test.ts
//
// WIZARD-PAD-01 — Step-3 (bed-grid) layout balance source-guard.
// ---------------------------------------------------------------------------
//
// CONTEXT
// In `BookingWizardScreen.tsx` `renderStep3` (~line 484-513), the Step-3
// ScrollView is `className="flex-1 bg-white"` with
// `contentContainerStyle={{ padding: 16 }}`. The content container does NOT
// stretch (no `flexGrow`), so the bed grid hugs the TOP of the scroll area
// with a large empty void between it and the pinned "التالي" button. The fix
// adds `flexGrow: 1` to the Step-3 (and Step-4 if needed) contentContainerStyle
// so the content fills the available height and the grid can be vertically
// balanced (e.g. a `flex-1 justify-center` wrapper around the grid).
//
// WHY SOURCE-REGEX HERE
// `flexGrow: 1` on a ScrollView's contentContainerStyle has no observable
// effect under @testing-library/react-native's non-layout renderer (no real
// flex layout runs in jsdom-style RN testing), so a behavioral assertion
// would be a no-op. The contract is purely a style-shape one — pin it at the
// source level. Mirrors the source-guard pattern already used in this file's
// sibling `BookingWizardScreen.test.tsx` (CLIENT-1.1 / CLIENT-2.11).
//
// MINIMAL by design: we ONLY pin that Step 3's ScrollView contentContainerStyle
// includes `flexGrow: 1`. We do NOT over-pin exact classNames or the grid
// wrapper structure — the implementer keeps layout freedom beyond flexGrow.
//
// `test.failing` per the Bugs Policy: today's Step-3 contentContainerStyle is
// `{ padding: 16 }` with no flexGrow, so the assertion throws. When the
// implementer adds `flexGrow: 1` and the body stops throwing, Jest reports
// "Failing test passed" → drop `.failing`.

import * as fs from 'fs';
import * as path from 'path';

const wizardPath = path.resolve(
  __dirname,
  '..',
  'BookingWizardScreen.tsx'
);

function readSource(): string {
  return fs.readFileSync(wizardPath, 'utf8');
}

// Carve out the `renderStep3` function body so the assertion targets STEP 3
// specifically (not Step 1/2/4's ScrollViews). renderStep3 is an arrow
// function: `const renderStep3 = () => ( ... );`. We slice from its
// declaration to the next `const renderStep` declaration (renderStep4).
function renderStep3Body(src: string): string {
  const startIdx = src.indexOf('const renderStep3');
  expect(startIdx).toBeGreaterThan(-1);
  const afterStart = src.slice(startIdx);
  // End at the start of the next render function (renderStep4) so we don't
  // bleed into Step-4's ScrollView.
  const endRel = afterStart.indexOf('const renderStep4');
  const body = endRel > -1 ? afterStart.slice(0, endRel) : afterStart;
  return body;
}

describe('WIZARD-PAD-01 — Step-3 bed-grid layout balance', () => {
  // -------- SANITY ANCHOR --------
  test('sanity: renderStep3 exists and contains a ScrollView with contentContainerStyle', () => {
    const body = renderStep3Body(readSource());
    expect(/<ScrollView\b/.test(body)).toBe(true);
    expect(/contentContainerStyle\s*=/.test(body)).toBe(true);
  });

  test(
    "WIZARD-PAD-01: Step-3 ScrollView contentContainerStyle includes flexGrow: 1 (so the bed grid fills the height instead of hugging the top)",
    () => {
      const body = renderStep3Body(readSource());

      // Find the Step-3 ScrollView's contentContainerStyle object literal and
      // assert it contains `flexGrow: 1`. We match a `contentContainerStyle={{
      // ... }}` object and check it for the flexGrow key. Whitespace tolerant.
      const ccsMatch = body.match(
        /contentContainerStyle\s*=\s*\{\{([\s\S]*?)\}\}/
      );
      expect(ccsMatch).not.toBeNull();
      const ccsBody = (ccsMatch as RegExpMatchArray)[1];
      expect(/\bflexGrow\s*:\s*1\b/.test(ccsBody)).toBe(true);
    }
  );
});

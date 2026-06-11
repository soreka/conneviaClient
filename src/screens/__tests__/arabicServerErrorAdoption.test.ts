// src/screens/__tests__/arabicServerErrorAdoption.test.ts
//
// ARABIC-ERR-02 — source-shape guards that the error-surfacing call sites
// adopt the `arabicServerError` helper (ARABIC-ERR-01) and stop interpolating
// the raw English server string directly.
// ---------------------------------------------------------------------------
//
// CONTEXT
// Six screens surface server errors in toasts/alerts via
//   `err?.data?.error || '<Arabic fallback>'`  (or `error?.data?.error || ...`)
// The `||` short-circuits to the English server string whenever the server
// sends a non-empty `error`, so the Arabic fallback never fires and English
// leaks to the user. ARABIC-ERR-01 introduces `arabicServerError(err,
// fallback)` (in `src/utils/serverErrors.ts`) which maps the error to Arabic.
// ARABIC-ERR-02 is the adoption: each surfacing site must
//   (a) import `arabicServerError` from the utils module, and
//   (b) no longer interpolate `err?.data?.error ||` / `error?.data?.error ||`
//       directly (the raw-string-OR-fallback anti-pattern).
//
// WHY SOURCE-REGEX HERE
// These are precise, low-surface contracts: "this import exists" and "this
// anti-pattern is gone." A behavioral render of each screen's error path
// would require mounting the screen, mocking its full RTK Query surface,
// firing the failing mutation, and intercepting Alert.alert/Toast — a large,
// brittle mock surface relative to the contract. We mirror the source-guard
// pattern already used by `RootNavigator.authAudit.test.ts` and
// `profileCompletionGate.test.ts`. The behavioral guarantee for the MAPPING
// itself is covered unit-style by `src/utils/__tests__/serverErrors.test.ts`
// (ARABIC-ERR-01); this file only pins that the sites WIRE UP to it.
//
// `test.failing` per the Bugs Policy: today the sites still ship the raw
// `||`-fallback, so the assertions throw. When the implementer adopts the
// helper at every site and the bodies stop throwing, Jest reports "Failing
// test passed" → drop `.failing`.

import * as fs from 'fs';
import * as path from 'path';

// Repo-root-relative paths to the six surfacing sites.
const SCREENS_DIR = path.resolve(__dirname, '..');

const SITES: { label: string; relPath: string }[] = [
  {
    label: 'BookingWizardScreen',
    relPath: 'Booking/BookingWizardScreen.tsx',
  },
  {
    label: 'MyBookingsScreen',
    relPath: 'MyBookingsScreen.tsx',
  },
  {
    label: 'SubscriptionPlansScreen',
    relPath: 'SubscriptionPlans/SubscriptionPlansScreen.tsx',
  },
  {
    label: 'AdminDashboardScreen',
    relPath: 'Admin/AdminDashboardScreen.tsx',
  },
  {
    label: 'AdminPaymentsScreen',
    relPath: 'Admin/AdminPaymentsScreen.tsx',
  },
  {
    label: 'AddBookingModal',
    relPath: 'Admin/components/AddBookingModal.tsx',
  },
];

function readSite(relPath: string): string {
  return fs.readFileSync(path.join(SCREENS_DIR, relPath), 'utf8');
}

// The anti-pattern: `err?.data?.error ||` or `error?.data?.error ||`
// (whitespace-tolerant). This is exactly what must DISAPPEAR.
const RAW_DATA_ERROR_OR =
  /\b(err|error)\s*\?\.\s*data\s*\?\.\s*error\s*\|\|/;

describe('ARABIC-ERR-02 — surfacing sites adopt arabicServerError', () => {
  // -------- SANITY ANCHOR --------
  // If a site file goes missing the path map is stale; bail loudly rather
  // than silently passing.
  test('sanity: all six surfacing-site files exist and are readable', () => {
    for (const site of SITES) {
      const full = path.join(SCREENS_DIR, site.relPath);
      expect(fs.existsSync(full)).toBe(true);
      expect(readSite(site.relPath).length).toBeGreaterThan(0);
    }
  });

  describe.each(SITES)('$label', (site) => {
    test(
      `ARABIC-ERR-02: ${site.label} imports arabicServerError from the serverErrors util`,
      () => {
        const src = readSite(site.relPath);
        // Accept any relative depth to `utils/serverErrors`. Must name the
        // `arabicServerError` symbol in the import.
        const importsHelper =
          /import\s*\{[^}]*\barabicServerError\b[^}]*\}\s*from\s*['"][^'"]*utils\/serverErrors['"]/.test(
            src
          );
        expect(importsHelper).toBe(true);
      }
    );

    test(
      `ARABIC-ERR-02: ${site.label} no longer interpolates err?.data?.error || / error?.data?.error || directly`,
      () => {
        const src = readSite(site.relPath);
        expect(RAW_DATA_ERROR_OR.test(src)).toBe(false);
      }
    );

    test(
      `ARABIC-ERR-02: ${site.label} actually CALLS arabicServerError(...) at least once`,
      () => {
        const src = readSite(site.relPath);
        expect(/\barabicServerError\s*\(/.test(src)).toBe(true);
      }
    );
  });
});

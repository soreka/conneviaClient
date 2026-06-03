// src/screens/Booking/__tests__/BookingWizardScreen.dayGroupingTz.test.ts
//
// C-UX-09 (pre-ship audit 2026-06-03)
// ---------------------------------------------------------------------------
// INTENDED BEHAVIOR (pin):
//   In `src/screens/Booking/BookingWizardScreen.tsx`, the Step-1 day grid
//   groups sessions by date. The GROUPING KEY and the day-name/LABEL must
//   derive from the SAME timezone basis (Asia/Jerusalem local) so a
//   session whose local time is e.g. 23:30 on Wednesday is grouped under
//   the same Wednesday card that is labeled "الأربعاء".
//
//   Today the wizard computes the grouping key via
//     `formatDateKey(date)` = `date.toISOString().split('T')[0]`
//   which is a UTC date (BookingWizardScreen.tsx:67-69), while the
//   day-name/label is computed via
//     `getArabicDayName(date)` = `date.getDay()` (uses the device local
//     timezone)  (BookingWizardScreen.tsx:71-74)
//   and
//     `formatArabicDate(date)` = `date.getDate() + months[date.getMonth()]`
//     (BookingWizardScreen.tsx:76-82) (also local).
//
//   That means near midnight Asia/Jerusalem, a session whose UTC date is
//   one day ahead/behind the local date is grouped into a DayGroup whose
//   `dayName`/`displayDate` belong to a DIFFERENT day. Result: a 23:30
//   session shows up under "tomorrow's" card, or a 00:30 session shows up
//   under "yesterday's" card — confusing UX and a real correctness issue
//   for the consumer funnel because the studio is in Israel (Asia/Jerusalem,
//   UTC+2/+3).
//
//   The fix must:
//     (a) Compute the grouping key from the SAME timezone basis as the
//         label. Either use a luxon-based Asia/Jerusalem `toFormat('yyyy-MM-dd')`,
//         or compute the local date via `getFullYear/getMonth/getDate` and
//         pad them — but NEVER use `toISOString().slice(0,10)` for the
//         key while using `getDay/getDate/getMonth` for the label.
//     (b) Group sessions into that key with the same basis (the
//         `sessions.forEach` populator must also use the local-date key,
//         not a UTC one).
//
//   The OBSERVABLE contract this guard pins (source-level): the
//   `formatDateKey` (or equivalent grouping primitive) MUST NOT use
//   `toISOString().split('T')[0]` (or `.slice(0,10)`), i.e. it must not
//   derive a UTC-shifted date while the labels use local-date getters.
//
// WHY A SOURCE-REGEX GUARD HERE
// A behavioral test would need to (a) freeze the system clock at a UTC
// time that crosses local midnight (e.g. 22:00Z = 00:00 Asia/Jerusalem in
// summer or 01:00 in winter), (b) feed `useGetSessionsQuery` a session
// whose `startsAt` is on that boundary, (c) drill into the rendered
// Step-1 DayCard list and locate the card holding the session, (d) read
// the dayName/displayDate text on that card and assert it matches the
// session's LOCAL date. The amount of clock/timezone gymnastics + Step-1
// navigation is large compared to the precision of the source-level
// contract (don't pair a UTC key with a local label). The implementer is
// free to convert this to a true rendered test (e.g. with luxon's
// `Settings.defaultZone` + a freezegun) once the grouping primitive is
// luxon-based.
//
// This file does NOT import BookingWizardScreen — the wizard pulls in
// react-navigation, RTK Query, and reanimated, which is unnecessary
// noise for a static check.

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

describe('C-UX-09 — day-grouping key and day-name label must share a timezone basis', () => {
  // Sanity: confirm the file still has `formatDateKey`, `getArabicDayName`,
  // and `formatArabicDate`. If any of these are renamed/extracted to a
  // shared util, the implementer needs to refresh the regex.
  test('sanity: BookingWizardScreen.tsx still exposes formatDateKey + getArabicDayName + formatArabicDate', () => {
    const src = readSource();
    expect(src).toMatch(/formatDateKey/);
    expect(src).toMatch(/getArabicDayName/);
    expect(src).toMatch(/formatArabicDate/);
  });

  // Intended (1/2): the grouping KEY must not be a UTC date derived via
  // `toISOString().split('T')[0]` / `toISOString().slice(0, 10)` while
  // the LABELS use the local-date getters (`getDay`, `getDate`,
  // `getMonth`). The simplest pin: the wizard source must not contain
  // the `toISOString()...split('T')[0]` / `.slice(0, 10)` UTC-date
  // pattern, because that is the exact UTC-shift bug.
  //
  // We accept the fix in either direction: luxon `DateTime.fromJSDate(d,
  // { zone: 'Asia/Jerusalem' }).toFormat('yyyy-MM-dd')`, a hand-rolled
  // `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
  // or any other primitive that does NOT cross the UTC boundary.
  test(
    'C-UX-09: the day-grouping key must NOT derive from `toISOString().split("T")[0]` / `.slice(0,10)` (UTC date) while labels use local getters',
    () => {
      const src = readSource();

      // Buggy patterns the fix must remove.
      const utcKeyViaSplit = /toISOString\s*\(\s*\)\s*\.\s*split\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]/;
      const utcKeyViaSlice = /toISOString\s*\(\s*\)\s*\.\s*slice\(\s*0\s*,\s*10\s*\)/;

      // The wizard's day-label/day-name getters must keep using local
      // getters (or the implementer can switch BOTH to a shared local
      // basis). We do not pin the label form — only that the UTC key
      // form is gone.
      expect(src).not.toMatch(utcKeyViaSplit);
      expect(src).not.toMatch(utcKeyViaSlice);
    }
  );

  // Intended (2/2): once the UTC key is removed, the grouping primitive
  // and the populator must share a local basis. The simplest pin: if
  // `formatDateKey` (the grouping primitive) survives, its body MUST NOT
  // call `toISOString`; if it's been replaced with a luxon-based helper
  // or an inline expression, the same constraint applies — the helper
  // must not internally derive its key via UTC ISO truncation.
  //
  // We carve out the `formatDateKey` function body (if present) and
  // assert it does not contain `toISOString`. If the implementer removed
  // `formatDateKey` entirely (folded into a luxon call), the body match
  // is empty and the test passes trivially — that's fine, because guard
  // (1/2) already forbids the UTC pattern anywhere in the source.
  test(
    'C-UX-09: `formatDateKey` (if still present) does not use `toISOString` — it shares the local-date basis the labels already use',
    () => {
      const src = readSource();

      // Match `const formatDateKey = (...) => { ... }` or
      // `function formatDateKey(...) { ... }`. We allow either form.
      const arrowBody = src.match(
        /const\s+formatDateKey\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?=>\s*\{([\s\S]*?)\n\}\s*;/
      );
      const fnBody = src.match(
        /function\s+formatDateKey\s*\([^)]*\)\s*(?::\s*[^{]+)?\{([\s\S]*?)\n\}/
      );
      const body = (arrowBody && arrowBody[1]) || (fnBody && fnBody[1]) || '';

      // If `formatDateKey` was deleted entirely (folded into luxon at
      // each call site), body === '' and the assertion below is vacuous —
      // which is fine. The UTC-key forbid is owned by guard (1/2).
      expect(body).not.toMatch(/toISOString/);
    }
  );
});

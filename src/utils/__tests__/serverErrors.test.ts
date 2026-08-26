// src/utils/__tests__/serverErrors.test.ts
//
// ARABIC-ERR-01 — unit tests for the (not-yet-built) `arabicServerError`
// helper in `src/utils/serverErrors.ts`.
// ---------------------------------------------------------------------------
//
// CONTEXT
// The production UI is fully Arabic, but RAW SERVER ERROR STRINGS (English)
// leak into toasts/alerts because call sites today prefer
// `err?.data?.error || '<Arabic fallback>'`. When the server sends a real
// message (e.g. "Session is full") the `||` short-circuits to the English
// string and the Arabic fallback never fires. ARABIC-ERR-01 introduces a
// resolver that maps server errors to Arabic:
//
//   export function arabicServerError(err: unknown, fallback: string): string
//
// RESOLUTION ORDER (pinned by the tests below):
//   1. Payload `reason`/`code` matches the known-code map  → its Arabic msg.
//      (Accept BOTH shapes: RTK Query `err.data`, axios `err.response.data`.)
//   2. Else `error`/`message` string matches a known ENGLISH server string
//      (substring / regex for dynamic bed-number strings)  → Arabic.
//   3. Else the server message CONTAINS Arabic characters (/[؀-ۿ]/)
//      → pass it through verbatim.
//   4. Else (unknown English / missing / network error)    → the per-call
//      Arabic `fallback`.
//
// These are `test.failing` per the Bugs Policy: the helper does not exist
// yet, so the dynamic `require` throws (= the body throws = an expected
// failure). When the implementer creates the module + function and the body
// stops throwing, Jest reports "Failing test passed" → drop `.failing`.
//
// Wording freedom: for most codes/strings we assert the result CONTAINS
// Arabic characters AND is NOT the raw English/code (so the implementer
// chooses wording). A few representative cases are exact-matched to lock a
// concrete contract; those exact strings are documented for the implementer
// in `.claude/REVIEW_FINDINGS.md` (ARABIC-ERR-01).

// The helper module does not exist yet. Import it lazily INSIDE each test so
// the module-resolution throw counts as the test body throwing (which is what
// `test.failing` expects). A top-level `import` would throw at module-load and
// crash the whole suite instead of being captured per-test.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadHelper(): (err: unknown, fallback: string) => string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../serverErrors');
  return mod.arabicServerError as (err: unknown, fallback: string) => string;
}

const ARABIC_RE = /[؀-ۿ]/;
const FALLBACK = 'حدث خطأ، حاول مرة أخرى';

// RTK Query error shape: `{ status, data: { error, code, ... } }`.
function rtkError(data: Record<string, unknown>) {
  return { status: 400, data };
}

// axios error shape: `{ response: { status, data: { error, code, ... } } }`.
function axiosError(data: Record<string, unknown>) {
  return { response: { status: 400, data } };
}

// All known server error CODES (payload `code`/`reason`). The implementer
// maps each to an Arabic message — we only assert "is Arabic, isn't the raw
// code/English, isn't the generic fallback" for the bulk, plus a few exacts.
const KNOWN_CODES = [
  'NO_SUBSCRIPTION',
  'SESSION_BEFORE_SUB_START',
  'NO_CREDITS',
  'WEEKLY_CAP_REACHED',
  'SESSION_OUTSIDE_SUB_RANGE',
  'UNKNOWN_PLAN_LIMIT',
  'SUBSCRIPTION_NOT_ELIGIBLE',
  'PENDING_SUBMISSION_EXISTS',
  'NO_CURRENT_SUBSCRIPTION',
  'PLAN_MISMATCH',
  'NOT_AN_UPGRADE',
  'NOT_A_DOWNGRADE',
  'INVALID_ACTION',
  'NEXT_SUBSCRIPTION_ALREADY_SET',
  'INVALID_PLAN',
  'VALIDATION_ERROR',
  'EMAIL_IN_USE',
] as const;

// Known ENGLISH server strings (tier 2). Some are exact, some dynamic.
const KNOWN_STATIC_STRINGS = [
  'Session is full',
  'You already have a booking for this session',
  'Session is not available for booking',
  'Session not found',
  'Reservation not found',
  'Reservation is already canceled',
  'Only booked reservations can be canceled',
  'No available beds',
  'Customer not found',
  'Session is already canceled',
  'Cannot book session',
  'Validation failed',
  'Internal server error',
  'Not found',
] as const;

describe('ARABIC-ERR-01 — arabicServerError resolution', () => {
  // ===================================================================
  // SANITY — the module + export must exist with the right signature.
  // ===================================================================
  test(
    'ARABIC-ERR-01: module src/utils/serverErrors.ts exports arabicServerError(err, fallback)',
    () => {
      const fn = loadHelper();
      expect(typeof fn).toBe('function');
      // arity: (err, fallback)
      expect(fn.length).toBe(2);
    }
  );

  // ===================================================================
  // TIER 1 — payload code/reason match → Arabic (both error shapes)
  // ===================================================================
  describe.each(KNOWN_CODES)('tier 1 — known code %s', (code) => {
    test(
      `ARABIC-ERR-01: code "${code}" (RTK shape err.data.code) resolves to Arabic, not the raw code/English`,
      () => {
        const fn = loadHelper();
        const out = fn(rtkError({ code, error: 'some English message' }), FALLBACK);
        expect(ARABIC_RE.test(out)).toBe(true);
        expect(out).not.toBe(code);
        expect(out).not.toBe('some English message');
        expect(out).not.toBe(FALLBACK);
      }
    );

    test(
      `ARABIC-ERR-01: code "${code}" (axios shape err.response.data.code) resolves to Arabic, not the raw code/English`,
      () => {
        const fn = loadHelper();
        const out = fn(
          axiosError({ code, error: 'some English message' }),
          FALLBACK
        );
        expect(ARABIC_RE.test(out)).toBe(true);
        expect(out).not.toBe(code);
        expect(out).not.toBe(FALLBACK);
      }
    );
  });

  test(
    'ARABIC-ERR-01: payload `reason` field is honored the same as `code` (RTK shape)',
    () => {
      const fn = loadHelper();
      const out = fn(rtkError({ reason: 'NO_CREDITS' }), FALLBACK);
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe('NO_CREDITS');
      expect(out).not.toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: a known code wins over a known English string in the same payload (code tier takes precedence)',
    () => {
      const fn = loadHelper();
      // Both a code AND an English error are present. Tier 1 (code) must win.
      const out = fn(
        rtkError({ code: 'NO_CREDITS', error: 'Session is full' }),
        FALLBACK
      );
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe('Session is full');
      expect(out).not.toBe(FALLBACK);
    }
  );

  // Representative exact-match contracts. The implementer is free to tweak
  // wording, but these few are pinned so the resolver demonstrably maps the
  // specific concept (and the corresponding entries are documented in
  // REVIEW_FINDINGS.md so an implementer wording change updates both).
  test(
    'ARABIC-ERR-01: NO_SUBSCRIPTION → "لا يوجد اشتراك نشط"',
    () => {
      const fn = loadHelper();
      expect(fn(rtkError({ code: 'NO_SUBSCRIPTION' }), FALLBACK)).toBe(
        'لا يوجد اشتراك نشط'
      );
    }
  );

  test(
    'ARABIC-ERR-01: WEEKLY_CAP_REACHED → "لقد وصلت إلى الحد الأسبوعي للحجوزات"',
    () => {
      const fn = loadHelper();
      expect(fn(rtkError({ code: 'WEEKLY_CAP_REACHED' }), FALLBACK)).toBe(
        'لقد وصلت إلى الحد الأسبوعي للحجوزات'
      );
    }
  );

  // CREDITS-07: reworded. Credits are a balance the member OWNS and which
  // outlives any subscription, so the old "in your subscription" phrasing
  // misdescribed the refusal — a member can be out of classes while holding a
  // perfectly valid subscription, and vice versa.
  test(
    'ARABIC-ERR-01: NO_CREDITS → "لا توجد حصص متبقية في رصيدك"',
    () => {
      const fn = loadHelper();
      expect(fn(rtkError({ code: 'NO_CREDITS' }), FALLBACK)).toBe(
        'لا توجد حصص متبقية في رصيدك'
      );
    }
  );

  test(
    'CREDITS-07: INSUFFICIENT_CREDITS → Arabic, not the raw code',
    () => {
      const fn = loadHelper();
      expect(fn(rtkError({ code: 'INSUFFICIENT_CREDITS' }), FALLBACK)).toBe(
        'الرصيد غير كافٍ لهذه العملية'
      );
    }
  );

  // ===================================================================
  // TIER 2 — known ENGLISH server string → Arabic (both shapes)
  // ===================================================================
  describe.each(KNOWN_STATIC_STRINGS)(
    'tier 2 — known English string "%s"',
    (msg) => {
      test(
        `ARABIC-ERR-01: "${msg}" (RTK shape err.data.error) maps to Arabic, not the raw English`,
        () => {
          const fn = loadHelper();
          const out = fn(rtkError({ error: msg }), FALLBACK);
          expect(ARABIC_RE.test(out)).toBe(true);
          expect(out).not.toBe(msg);
          expect(out).not.toBe(FALLBACK);
        }
      );

      test(
        `ARABIC-ERR-01: "${msg}" (axios shape err.response.data.error) maps to Arabic, not the raw English`,
        () => {
          const fn = loadHelper();
          const out = fn(axiosError({ error: msg }), FALLBACK);
          expect(ARABIC_RE.test(out)).toBe(true);
          expect(out).not.toBe(msg);
          expect(out).not.toBe(FALLBACK);
        }
      );
    }
  );

  test(
    'ARABIC-ERR-01: a known English string under the `message` key (not just `error`) is mapped',
    () => {
      const fn = loadHelper();
      // Some payloads use `message` instead of `error`.
      const out = fn(rtkError({ message: 'Session is full' }), FALLBACK);
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe('Session is full');
      expect(out).not.toBe(FALLBACK);
    }
  );

  // ---- Dynamic bed-number strings (regex match) ----
  test(
    'ARABIC-ERR-01: dynamic "Bed 3 is already booked" maps to Arabic, not the raw English',
    () => {
      const fn = loadHelper();
      const out = fn(rtkError({ error: 'Bed 3 is already booked' }), FALLBACK);
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe('Bed 3 is already booked');
      expect(out).not.toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: dynamic "Bed 12 is already booked" (multi-digit) also maps to Arabic',
    () => {
      const fn = loadHelper();
      const out = fn(rtkError({ error: 'Bed 12 is already booked' }), FALLBACK);
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe('Bed 12 is already booked');
      expect(out).not.toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: dynamic "Bed number must be between 1 and 6" maps to Arabic, not the raw English',
    () => {
      const fn = loadHelper();
      const out = fn(
        rtkError({ error: 'Bed number must be between 1 and 6' }),
        FALLBACK
      );
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe('Bed number must be between 1 and 6');
      expect(out).not.toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: dynamic "Bed number must be between 1 and 10" (multi-digit) also maps to Arabic',
    () => {
      const fn = loadHelper();
      const out = fn(
        rtkError({ error: 'Bed number must be between 1 and 10' }),
        FALLBACK
      );
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe('Bed number must be between 1 and 10');
      expect(out).not.toBe(FALLBACK);
    }
  );

  // ===================================================================
  // TIER 3 — server message already contains Arabic → passthrough
  // ===================================================================
  test(
    'ARABIC-ERR-01: an Arabic server message is passed through verbatim (RTK shape)',
    () => {
      const fn = loadHelper();
      const arabicServerMsg = 'لديك طلب قيد المراجعة، لا يمكنك تقديم طلب آخر';
      const out = fn(rtkError({ error: arabicServerMsg }), FALLBACK);
      expect(out).toBe(arabicServerMsg);
    }
  );

  test(
    'ARABIC-ERR-01: an Arabic server message is passed through verbatim (axios shape)',
    () => {
      const fn = loadHelper();
      const arabicServerMsg = 'الحصة ممتلئة بالكامل';
      const out = fn(axiosError({ error: arabicServerMsg }), FALLBACK);
      expect(out).toBe(arabicServerMsg);
    }
  );

  test(
    'ARABIC-ERR-01: Arabic passthrough applies to the `message` key too',
    () => {
      const fn = loadHelper();
      const arabicServerMsg = 'تعذّر إتمام العملية';
      const out = fn(rtkError({ message: arabicServerMsg }), FALLBACK);
      expect(out).toBe(arabicServerMsg);
    }
  );

  // ===================================================================
  // TIER 4 — fallback (unknown English / missing / network error)
  // ===================================================================
  test(
    'ARABIC-ERR-01: an UNKNOWN English server string falls back to the Arabic fallback (does NOT leak English)',
    () => {
      const fn = loadHelper();
      const out = fn(
        rtkError({ error: 'Some brand new untranslated server error' }),
        FALLBACK
      );
      expect(out).toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: undefined error → fallback',
    () => {
      const fn = loadHelper();
      expect(fn(undefined, FALLBACK)).toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: null error → fallback',
    () => {
      const fn = loadHelper();
      expect(fn(null, FALLBACK)).toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: empty object error → fallback',
    () => {
      const fn = loadHelper();
      expect(fn({}, FALLBACK)).toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: RTK Query FETCH_ERROR (network, no data payload) → fallback',
    () => {
      const fn = loadHelper();
      // RTK Query network failures look like { status: 'FETCH_ERROR', error: 'TypeError: Network request failed' }
      const out = fn(
        { status: 'FETCH_ERROR', error: 'TypeError: Network request failed' },
        FALLBACK
      );
      expect(out).toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: RTK Query TIMEOUT_ERROR → fallback',
    () => {
      const fn = loadHelper();
      const out = fn({ status: 'TIMEOUT_ERROR' }, FALLBACK);
      expect(out).toBe(FALLBACK);
    }
  );

  test(
    'ARABIC-ERR-01: a thrown Error instance with an unknown English message → fallback (does NOT leak the JS message)',
    () => {
      const fn = loadHelper();
      const out = fn(new Error('Request failed with status code 500'), FALLBACK);
      expect(out).toBe(FALLBACK);
      expect(out).not.toContain('status code 500');
    }
  );

  test(
    'ARABIC-ERR-01: a bare string error that is unknown English → fallback',
    () => {
      const fn = loadHelper();
      expect(fn('Request failed with status code 409', FALLBACK)).toBe(FALLBACK);
    }
  );

  // ===================================================================
  // GUARANTEE — the result is ALWAYS Arabic (never leaks English)
  // ===================================================================
  test(
    'ARABIC-ERR-01: across all tiers, the returned string is ALWAYS Arabic and never the raw English server string',
    () => {
      const fn = loadHelper();
      const cases: unknown[] = [
        rtkError({ code: 'NO_SUBSCRIPTION' }),
        axiosError({ code: 'WEEKLY_CAP_REACHED' }),
        rtkError({ error: 'Session is full' }),
        rtkError({ error: 'Bed 4 is already booked' }),
        rtkError({ error: 'Bed number must be between 1 and 8' }),
        rtkError({ error: 'لديك طلب قيد المراجعة' }),
        rtkError({ error: 'Totally unknown English error' }),
        { status: 'FETCH_ERROR' },
        undefined,
        null,
        {},
        new Error('boom'),
      ];
      for (const c of cases) {
        const out = fn(c, FALLBACK);
        expect(typeof out).toBe('string');
        expect(out.length).toBeGreaterThan(0);
        expect(ARABIC_RE.test(out)).toBe(true);
      }
    }
  );

  // ===================================================================
  // PAST-SESSION-ERR — codes that arrive under the `error` field
  // ===================================================================
  // The past-session booking guard responds
  //   `{ ok:false, error:'SESSION_IN_PAST', message:'لا يمكن الحجز في حصة انتهت' }`
  // — the CODE lives in `error`, not `code`/`reason`. The resolver must map it
  // (via the code map, or by using the Arabic `message`) instead of falling
  // back to the generic per-call message, which is what the user reported
  // seeing at the confirm step.
  test(
    'PAST-SESSION-ERR: SESSION_IN_PAST under the `error` field resolves to the specific Arabic past-session message (RTK shape)',
    () => {
      const fn = loadHelper();
      const out = fn(
        rtkError({ ok: false, error: 'SESSION_IN_PAST', message: 'لا يمكن الحجز في حصة انتهت' }),
        FALLBACK
      );
      expect(out).toBe('لا يمكن الحجز في حصة انتهت');
    }
  );

  test(
    'PAST-SESSION-ERR: SESSION_IN_PAST resolves even WITHOUT the Arabic message field (axios shape)',
    () => {
      const fn = loadHelper();
      const out = fn(axiosError({ error: 'SESSION_IN_PAST' }), FALLBACK);
      expect(ARABIC_RE.test(out)).toBe(true);
      expect(out).not.toBe(FALLBACK);
      expect(out).not.toContain('SESSION_IN_PAST');
    }
  );

  test(
    'PAST-SESSION-ERR: an UNKNOWN code under `error` still uses an Arabic `message` from the same payload instead of the fallback',
    () => {
      const fn = loadHelper();
      const out = fn(
        rtkError({ error: 'SOME_FUTURE_CODE', message: 'رسالة عربية من الخادم' }),
        FALLBACK
      );
      expect(out).toBe('رسالة عربية من الخادم');
    }
  );
});

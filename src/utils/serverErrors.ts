/**
 * serverErrors.ts — ARABIC-ERR-01
 *
 * The product UI is fully Arabic, but raw server error strings (English) used
 * to leak into toasts/alerts because call sites preferred
 * `err?.data?.error || '<Arabic fallback>'`: when the server sent a real
 * non-empty English `error` (e.g. "Session is full") the `||` short-circuited
 * to the English string and the Arabic fallback never fired.
 *
 * `arabicServerError(err, fallback)` resolves an unknown error to an Arabic
 * string with the following pinned resolution order:
 *
 *   1. Payload `reason`/`code` matches the known-code map → its Arabic message.
 *      Accepts BOTH error shapes: RTK Query (`err.data`) and axios
 *      (`err.response.data`).
 *   2. Else `error`/`message` string matches a known ENGLISH server string
 *      (static exact-match, or regex for the dynamic bed-number strings) →
 *      Arabic.
 *   3. Else the server message CONTAINS Arabic characters (/[؀-ۿ]/) → pass it
 *      through verbatim (the server already sends some Arabic).
 *   4. Else (unknown English / missing / network error) → the per-call Arabic
 *      `fallback`.
 *
 * The whole app addresses users in the feminine ("اختاري", "عميلة"), so the
 * wording here is warm and feminine-addressed to match.
 */

// Matches any Arabic character (Arabic + Arabic Supplement blocks).
const ARABIC_RE = /[؀-ۿ]/;

/**
 * Known server error CODES (payload `code`/`reason`) → Arabic message.
 *
 * Three entries are exact-match-pinned by the tests and documented in
 * `.claude/REVIEW_FINDINGS.md` (ARABIC-ERR-01) — changing their wording means
 * updating BOTH this map AND that note + the test:
 *   - NO_SUBSCRIPTION   → 'لا يوجد اشتراك نشط'
 *   - WEEKLY_CAP_REACHED → 'لقد وصلت إلى الحد الأسبوعي للحجوزات'
 *   - NO_CREDITS        → 'لا يوجد رصيد كافٍ في اشتراكك'
 * The rest are only asserted as "is Arabic, not the raw code/English, not the
 * generic fallback" — wording free.
 */
const CODE_MAP: Record<string, string> = {
  NO_SUBSCRIPTION: 'لا يوجد اشتراك نشط',
  SESSION_BEFORE_SUB_START: 'هذه الحصة قبل بداية اشتراكك',
  NO_CREDITS: 'لا يوجد رصيد كافٍ في اشتراكك',
  WEEKLY_CAP_REACHED: 'لقد وصلت إلى الحد الأسبوعي للحجوزات',
  SESSION_OUTSIDE_SUB_RANGE: 'هذه الحصة خارج فترة اشتراكك',
  UNKNOWN_PLAN_LIMIT: 'تعذّر تحديد حد الباقة، تواصلي مع الإدارة',
  SUBSCRIPTION_NOT_ELIGIBLE: 'اشتراكك غير مؤهّل لهذا الإجراء',
  PENDING_SUBMISSION_EXISTS: 'لديكِ طلب قيد المراجعة بالفعل',
  NO_CURRENT_SUBSCRIPTION: 'لا يوجد لديكِ اشتراك حالي',
  PLAN_MISMATCH: 'الباقة المختارة لا تطابق اشتراكك الحالي',
  NOT_AN_UPGRADE: 'الباقة المختارة ليست ترقية لاشتراكك',
  NOT_A_DOWNGRADE: 'الباقة المختارة ليست تخفيضاً لاشتراكك',
  INVALID_ACTION: 'هذا الإجراء غير صالح',
  NEXT_SUBSCRIPTION_ALREADY_SET: 'لديكِ اشتراك قادم محدّد بالفعل',
  INVALID_PLAN: 'الباقة المختارة غير صالحة',
  VALIDATION_ERROR: 'تحقّقي من البيانات المُدخلة وحاولي مرة أخرى',
  EMAIL_IN_USE: 'هذا البريد الإلكتروني مستخدم بالفعل',
};

/**
 * Known static ENGLISH server strings → Arabic message. Exact-match (after
 * trimming). Dynamic bed-number strings are handled separately via regex.
 */
const STRING_MAP: Record<string, string> = {
  'Session is full': 'الحصة ممتلئة بالكامل',
  'You already have a booking for this session': 'لديكِ حجز بالفعل في هذه الحصة',
  'Session is not available for booking': 'هذه الحصة غير متاحة للحجز',
  'Session not found': 'لم يتم العثور على الحصة',
  'Reservation not found': 'لم يتم العثور على الحجز',
  'Reservation is already canceled': 'هذا الحجز ملغى بالفعل',
  'Only booked reservations can be canceled': 'يمكن إلغاء الحجوزات المؤكدة فقط',
  'No available beds': 'لا توجد أسرّة متاحة',
  'Customer not found': 'لم يتم العثور على العميلة',
  'Session is already canceled': 'هذه الحصة ملغاة بالفعل',
  'Cannot book session': 'تعذّر حجز الحصة',
  'Validation failed': 'تحقّقي من البيانات المُدخلة وحاولي مرة أخرى',
  'Internal server error': 'حدث خطأ في الخادم، حاولي مرة أخرى لاحقاً',
  'Not found': 'لم يتم العثور على البيانات المطلوبة',
};

// Dynamic English server strings → Arabic. Each entry is a regex + builder.
const DYNAMIC_STRING_RULES: { test: RegExp; arabic: string }[] = [
  // "Bed 3 is already booked", "Bed 12 is already booked"
  { test: /^Bed \d+ is already booked$/, arabic: 'هذا السرير محجوز بالفعل' },
  // "Bed number must be between 1 and 6", "... and 10"
  {
    test: /^Bed number must be between 1 and \d+$/,
    arabic: 'رقم السرير غير صالح',
  },
];

/**
 * Narrow an unknown error to its payload object, accepting both shapes:
 *   - RTK Query: `{ status, data: {...} }`
 *   - axios:     `{ response: { status, data: {...} } }`
 */
function extractPayload(err: unknown): Record<string, unknown> | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as Record<string, unknown>;

  // axios shape: err.response.data
  const response = e.response;
  if (response && typeof response === 'object') {
    const data = (response as Record<string, unknown>).data;
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  }

  // RTK Query shape: err.data
  const data = e.data;
  if (data && typeof data === 'object') {
    return data as Record<string, unknown>;
  }

  return undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * Resolve an unknown error (RTK Query or axios shape) to an Arabic, user-facing
 * message. Never leaks the raw English server string or code.
 *
 * @param err      The error from a failed request (RTK Query or axios).
 * @param fallback A per-call Arabic message used when nothing else matches.
 */
export function arabicServerError(err: unknown, fallback: string): string {
  const payload = extractPayload(err);

  // ---- Tier 1: known code / reason ----
  if (payload) {
    const code = asString(payload.code) ?? asString(payload.reason);
    if (code && CODE_MAP[code]) {
      return CODE_MAP[code];
    }
  }

  // The server message can live under `error` or `message`, in either shape.
  const rawMessage = payload
    ? asString(payload.error) ?? asString(payload.message)
    : undefined;

  if (rawMessage) {
    const trimmed = rawMessage.trim();

    // ---- Tier 2a: known static English string ----
    if (STRING_MAP[trimmed]) {
      return STRING_MAP[trimmed];
    }

    // ---- Tier 2b: dynamic English string (bed numbers) ----
    for (const rule of DYNAMIC_STRING_RULES) {
      if (rule.test.test(trimmed)) {
        return rule.arabic;
      }
    }

    // ---- Tier 3: server message already contains Arabic → passthrough ----
    if (ARABIC_RE.test(rawMessage)) {
      return rawMessage;
    }
  }

  // ---- Tier 4: unknown English / missing / network error → fallback ----
  return fallback;
}

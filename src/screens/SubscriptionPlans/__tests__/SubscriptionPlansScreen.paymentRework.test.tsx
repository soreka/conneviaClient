// src/screens/SubscriptionPlans/__tests__/SubscriptionPlansScreen.paymentRework.test.tsx
//
// Bugs-Policy regression guards for the App Store ship-blocker
// "App-Store payment-compliance rework":
//
//   - C-STORE-01 / C-UX-01: the customer subscription flow must NOT contain
//     in-app payment steering (method picker, proof-of-transfer instructions,
//     "تأكيد الدفع" wording). Plan name + price are allowed as informational.
//     The plan CTA must be a neutral request that submits an out-of-band
//     access request.
//   - C-STORE-04: the createPaymentSubmission mutation must be invoked with
//     ONLY { planId, requestedAction } — NOT `method`, NOT `proofUrl`.
//
// Source: connevia/.claude/PRESHIP_AUDIT_2026-06-03.md (C-UX-01 / C-STORE-01 /
// C-STORE-04). Decided model (confirmed by product owner 2026-06-03): the
// studio arranges payment out of band (WhatsApp / in person); the app sends
// only a neutral "request this plan" intent.
//
// These tests are written .failing because the current production code in
// SubscriptionPlansScreen.tsx, PaymentMethodModal.tsx, and PlanCard.tsx
// STILL ships the in-app payment UI and STILL passes method/proofUrl to the
// mutation. The implementer drops `.failing` once the rework lands and the
// tests go green.
//
// Mocking strategy: per repo conventions, mocks live at the top of THIS
// file (jest.setup.ts is intentionally minimal). We stub:
//   - config/env (load-time env imports throughout the app)
//   - expo-secure-store (transitively reached via SubscriptionPlans imports)
//   - react-native-reanimated (the screen uses withTiming / withDelay)
//   - @react-navigation/native (useNavigation)
//   - features/api/apiSlice (the three RTK Query hooks the screen consumes)
// We DO NOT spin up a real Redux store or hit a real API.

// ---- Mocks (must come before importing the screen) -------------------------

jest.mock('../../../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 't',
    AUTH0_DOMAIN: 't',
    AUTH0_AUDIENCE: 't',
    API_URL: 'http://test.local',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// RTK Query hooks. The screen reads:
//   useGetSubscriptionPlansQuery() → { data: { plans: Plan[] }, isLoading }
//   useGetMySubscriptionQuery()    → { data: { current, pending }, isLoading }
//   useCreatePaymentSubmissionMutation() → [trigger, { isLoading }]
//
// We default to "no current subscription, no pending" so a plan tap goes
// directly into handleSelectPlan('upgrade_next_month') → opens the payment
// modal, with no Alert.alert in between (the 'same' / 'lower' / 'higher'
// branches all gate behind Alerts, which is harder to drive without an
// Alert spy and not necessary for the rework guard).
const mockPlan = {
  id: 'plan-8',
  name: 'باقة الـ8',
  monthlyLimit: 8,
  price: 45000, // 450 NIS in agorot
  priceFormatted: '450 ₪',
};
let mockPlans: any = { plans: [mockPlan] };
let mockSubscription: any = { current: null, pending: null };
// Explicitly typed mocks so spreads into them satisfy TS2556. We treat the
// arg lists as `unknown[]` (we never read them — the mocked hooks return a
// fixed shape) and give the trigger a concrete arg type so `mock.calls[0][0]`
// is well-typed instead of falling back to `never`/empty-tuple.
type CreatePaymentArg = {
  planId: string;
  requestedAction?: string;
  method?: string;
  proofUrl?: string;
  [k: string]: unknown;
};
const mockCreatePaymentTrigger = jest.fn(
  (_arg: CreatePaymentArg) => ({
    unwrap: () => Promise.resolve({ ok: true }),
  })
);
const mockUseGetSubscriptionPlansQuery = jest.fn((..._args: unknown[]) => ({
  data: mockPlans,
  isLoading: false,
}));
const mockUseGetMySubscriptionQuery = jest.fn((..._args: unknown[]) => ({
  data: mockSubscription,
  isLoading: false,
}));
const mockUseCreatePaymentSubmissionMutation = jest.fn(
  (..._args: unknown[]) =>
    [mockCreatePaymentTrigger, { isLoading: false }] as const
);
jest.mock('../../../features/api/apiSlice', () => ({
  useGetSubscriptionPlansQuery: (...a: unknown[]) =>
    mockUseGetSubscriptionPlansQuery(...a),
  useGetMySubscriptionQuery: (...a: unknown[]) =>
    mockUseGetMySubscriptionQuery(...a),
  useCreatePaymentSubmissionMutation: (...a: unknown[]) =>
    mockUseCreatePaymentSubmissionMutation(...a),
}));

// ---- Imports (after mocks) -------------------------------------------------

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SubscriptionPlansScreen } from '../SubscriptionPlansScreen';
import * as fs from 'fs';
import * as path from 'path';

const renderScreen = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <SubscriptionPlansScreen />
    </SafeAreaProvider>
  );

beforeEach(() => {
  mockPlans = { plans: [mockPlan] };
  mockSubscription = { current: null, pending: null };
  mockCreatePaymentTrigger.mockReset().mockImplementation((_arg) => ({
    unwrap: () => Promise.resolve({ ok: true }),
  }));
  mockNavigation.goBack.mockReset();
  mockNavigation.navigate.mockReset();
});

// Read the screen + modal sources once for source-regex backstops. Behavioral
// assertions are the primary signal; the regex assertions guard the parts of
// the contract that are hard to exercise through render alone (specifically:
// the mutation-arg shape, which under the current code path requires the
// user to select a method before the confirm button enables — so a pure
// fireEvent.press path can't reach the mutation on today's code).
const SCREEN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'SubscriptionPlansScreen.tsx'),
  'utf8'
);
const MODAL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'PaymentMethodModal.tsx'),
  'utf8'
);
const PLAN_CARD_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'PlanCard.tsx'),
  'utf8'
);

describe('SubscriptionPlans — App Store payment-rework (C-UX-01 / C-STORE-01 / C-STORE-04)', () => {
  test(
    'C-STORE-01: subscription request flow shows no in-app payment UI (no method picker / proof / تأكيد الدفع)',
    () => {
      const { queryByText, getByText } = renderScreen();

      // PRECONDITION — the price is allowed to render on the plan card. This
      // pins the "price is informational, not a checkout" contract: removing
      // the entire card body would silently satisfy the negative assertions
      // below, which is not the intent.
      // PlanCard renders `agorotToNis(45000)` = 250… wait — 45000 agorot =
      // 450 NIS. The card splits the number "450" from the unit "₪ / شهرياً".
      expect(getByText('450')).toBeTruthy();

      // Tap the plan's request CTA. With no current subscription
      // (`relation === 'new'`), this goes straight into handleSelectPlan
      // which opens the modal — no intermediate Alert.alert prompt.
      // Today the CTA reads "اختيار" (the `actionLabel` for the 'new'
      // branch). The decided rework changes the wording to a neutral
      // request like "اطلبي الباقة" — so this assertion intentionally
      // does NOT assume the literal label. We find the only TouchableOpacity
      // in the card by its text "اختيار" today; once the label changes the
      // implementer adjusts this lookup (or the test is updated as part of
      // the rework). Use `getAllByText` + first match so future label
      // tweaks don't immediately break the test for the wrong reason.
      const ctaCandidates = [
        ...screen.queryAllByText('اختيار'),
        ...screen.queryAllByText('اطلبي الباقة'),
        ...screen.queryAllByText(/اطلب.*الباقة/),
      ];
      expect(ctaCandidates.length).toBeGreaterThan(0);
      fireEvent.press(ctaCandidates[0]);

      // CORE CONTRACT — none of the in-app payment UI strings may render
      // in the resulting flow.
      //
      // 1) NO payment-method picker labels. The picker today renders both
      //    "كاش" and "تحويل بنكي" as METHOD CHOICES inside the modal — the
      //    rework removes the entire picker block.
      expect(queryByText('كاش')).toBeNull();
      expect(queryByText('تحويل بنكي')).toBeNull();
      expect(
        queryByText('اختر طريقة الدفع المفضلة لديك')
      ).toBeNull();
      expect(queryByText('الدفع نقداً في الاستوديو')).toBeNull();
      expect(queryByText('التحويل إلى حسابنا البنكي')).toBeNull();

      // 2) NO bank-transfer proof notice. Substring match — the exact
      //    sentence is "يرجى إرفاق إثبات التحويل البنكي بعد إتمام التحويل".
      expect(screen.queryByText(/إثبات/)).toBeNull();

      // 3) NO "تأكيد الدفع" wording (and no variants of "confirm payment").
      //    Today the confirm button reads "تأكيد الترقية" / "تأكيد التمديد"
      //    / "تأكيد التخفيض" depending on requestedAction — none of these
      //    should appear in the reworked neutral request flow. The
      //    bottom-of-modal disclaimer "سيتم تفعيل اشتراكك بعد تأكيد الدفع
      //    من قبل الإدارة" must also be gone.
      expect(screen.queryByText(/تأكيد الدفع/)).toBeNull();
      expect(screen.queryByText(/تأكيد الترقية/)).toBeNull();
      expect(screen.queryByText(/تأكيد التمديد/)).toBeNull();
      expect(screen.queryByText(/تأكيد التخفيض/)).toBeNull();

      // 4) NO "amount to pay" line. Today the modal renders
      //    "المبلغ: 450 ₪" — that whole row goes away under the rework.
      expect(screen.queryByText(/المبلغ:/)).toBeNull();

      // 5) NO "all prices in ILS / renews monthly" selling copy at the
      //    bottom of the screen (SubscriptionPlansScreen.tsx:281).
      expect(
        screen.queryByText(/جميع الأسعار بالشيكل الإسرائيلي/)
      ).toBeNull();

      // SOURCE BACKSTOPS — belt-and-suspenders for the parts above that
      // are render-coupled to which modal state is open. If the modal's
      // open-state predicate changes, these still pin the contract.
      // The decided rework removes these strings ENTIRELY from the modal
      // source.
      expect(MODAL_SRC).not.toMatch(/طريقة الدفع/);
      expect(MODAL_SRC).not.toMatch(/إثبات التحويل/);
      expect(MODAL_SRC).not.toMatch(/تأكيد الدفع/);
      // Cash / bank-transfer literal method tokens must not appear as
      // method choices in source (substring match catches both the
      // setSelectedMethod('cash'|'bank_transfer') calls and the label text).
      expect(MODAL_SRC).not.toMatch(/setSelectedMethod\(['"]cash['"]\)/);
      expect(MODAL_SRC).not.toMatch(
        /setSelectedMethod\(['"]bank_transfer['"]\)/
      );

      // PlanCard may keep displaying the price (informational), but the
      // SubscriptionPlansScreen must drop the selling tagline.
      expect(SCREEN_SRC).not.toMatch(
        /جميع الأسعار بالشيكل الإسرائيلي/
      );
    }
  );

  test(
    'C-UX-01/C-STORE-04: requesting a plan submits { planId, requestedAction } with no method/proofUrl',
    async () => {
      renderScreen();

      // Drive the rework's neutral request flow end-to-end. Under the
      // reworked code, tapping the plan CTA submits the request directly
      // (or via a single neutral "اطلبي" confirm) — there is no method
      // picker to navigate past. We try both the direct-tap and one-confirm
      // shapes so the test stays green for either choice the implementer
      // makes, as long as the OUTGOING ARG SHAPE is correct.
      const ctaCandidates = [
        ...screen.queryAllByText('اختيار'),
        ...screen.queryAllByText('اطلبي الباقة'),
        ...screen.queryAllByText(/اطلب.*الباقة/),
      ];
      expect(ctaCandidates.length).toBeGreaterThan(0);
      fireEvent.press(ctaCandidates[0]);

      // If a confirm step exists (a single neutral "اطلبي" / "تأكيد الطلب"
      // / "تأكيد" button — NOT "تأكيد الدفع"), press it.
      const confirmCandidates = [
        ...screen.queryAllByText('اطلبي'),
        ...screen.queryAllByText('تأكيد الطلب'),
        ...screen.queryAllByText('إرسال الطلب'),
      ];
      if (confirmCandidates.length > 0) {
        fireEvent.press(confirmCandidates[0]);
      }

      // Allow any pending microtasks (the mutation is fired inside an
      // async handler that awaits the unwrap()).
      await Promise.resolve();
      await Promise.resolve();

      // CORE CONTRACT — the mutation must have been called, exactly once,
      // with an arg that has planId + requestedAction and no method /
      // no proofUrl.
      expect(mockCreatePaymentTrigger).toHaveBeenCalled();
      // Narrow the call-arg access — `mock.calls` is `[CreatePaymentArg][]`
      // but the tuple-index access TS infers from a potentially-empty array
      // is a no-element-at-0 error (TS2493). Optional-chain the first call,
      // then assert presence at runtime — assertion strength is unchanged.
      const callArg = mockCreatePaymentTrigger.mock.calls[0]?.[0];
      expect(callArg).toBeDefined();
      expect(callArg).toMatchObject({
        planId: 'plan-8',
        requestedAction: expect.stringMatching(
          /^(renew|upgrade_current_month|upgrade_next_month|downgrade_next_month)$/
        ),
      });
      // The two fields the rework removes from the request body.
      expect(callArg).not.toHaveProperty('method');
      expect(callArg).not.toHaveProperty('proofUrl');

      // SOURCE BACKSTOP — the screen's createPayment(...) call site must
      // not pass `method` or `proofUrl`. This catches the case where the
      // mutation isn't reached at render time (e.g. the rework wires it
      // behind a separate flow) but the bug is still latent in source.
      // Today (buggy) the call site reads:
      //   await createPayment({ planId: selectedPlanId, method,
      //                         requestedAction: selectedAction,
      //                         proofUrl }).unwrap();
      // The rework should remove `method` and `proofUrl` from that object
      // literal. We grep the createPayment(...) call body for those keys.
      const createPaymentCall = SCREEN_SRC.match(
        /createPayment\s*\(\s*\{[\s\S]*?\}\s*\)/
      );
      expect(createPaymentCall).not.toBeNull();
      const body = createPaymentCall![0];
      // Match `method` and `proofUrl` as object-literal KEYS (followed by
      // `:` or `,` or `}`), not as substrings of other identifiers. This
      // avoids accidentally tripping on e.g. `methodLabel` or `proofUrlIsh`.
      expect(body).not.toMatch(/\bmethod\s*[:,}]/);
      expect(body).not.toMatch(/\bproofUrl\s*[:,}]/);

      // Defensive: also make sure the mutation request-type in apiSlice
      // doesn't reintroduce `method: 'cash' | 'bank_transfer'` as a REQUIRED
      // field. (We don't read apiSlice.ts as a hard regex here because
      // server-side rework lives in a separate ticket and the client may
      // legitimately still send method during a transition. The PRIMARY
      // assertion is the call-arg shape above.) PlanCard rendering the
      // price is allowed and not asserted negatively here.
      expect(PLAN_CARD_SRC).toContain('agorotToNis(price)'); // informational
    }
  );
});

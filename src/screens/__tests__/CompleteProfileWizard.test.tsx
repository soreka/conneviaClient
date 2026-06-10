// src/screens/__tests__/CompleteProfileWizard.test.tsx
// Tests for the onboarding wizard - the first funnel screen a brand new
// user sees after Auth0 signup.

jest.mock('../../config/env', () => ({
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

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));

// C-STORE-03: stub Linking after react-native is loaded so the new
// consent-line Privacy/Terms taps can be exercised without trying to open
// a real URL. Only the two methods we care about are replaced.
const mockOpenURL = jest.fn(() => Promise.resolve());
const mockCanOpenURL = jest.fn(() => Promise.resolve(true));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN = require('react-native');
RN.Linking.openURL = mockOpenURL;
RN.Linking.canOpenURL = mockCanOpenURL;

// Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// RTK Query
let mockMeData: any = { user: { email: 'sara@example.com' } };
const mockPatchMeFull = jest.fn().mockResolvedValue({
  user: { profileCompleted: true },
});
const mockPatchMeFullTrigger = jest.fn(() => ({
  unwrap: () => mockPatchMeFull(),
}));
const mockRefetchMe = jest.fn().mockResolvedValue(undefined);
jest.mock('../../features/api/apiSlice', () => ({
  useGetMeQuery: () => ({ data: mockMeData, refetch: mockRefetchMe }),
  usePatchMeFullMutation: () => [mockPatchMeFullTrigger, { isLoading: false }],
}));

const mockDispatch = jest.fn();
jest.mock('../../app/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));
jest.mock('../../features/auth/authSlice', () => ({
  logout: () => ({ type: 'auth/logout' }),
}));
jest.mock('../../navigation/navigationRef', () => ({
  resetToLogin: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CompleteProfileWizard } from '../CompleteProfileWizard';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Toast = require('react-native-toast-message').default;
const mockToastShow = Toast.show as jest.Mock;
const mockToastHide = Toast.hide as jest.Mock;

const renderWizard = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <CompleteProfileWizard />
    </SafeAreaProvider>
  );

beforeEach(() => {
  mockNavigate.mockReset();
  mockGoBack.mockReset();
  mockDispatch.mockReset();
  mockPatchMeFull.mockReset().mockResolvedValue({ user: { profileCompleted: true } });
  mockPatchMeFullTrigger.mockClear();
  mockRefetchMe.mockClear();
  mockToastShow.mockClear();
  mockToastHide.mockClear();
});

describe('CompleteProfileWizard - Step 1', () => {
  test('renders the title and basic-info section', () => {
    renderWizard();
    expect(screen.getByText('أكملي ملفك الشخصي')).toBeTruthy();
    expect(screen.getByText('المعلومات الأساسية')).toBeTruthy();
    expect(screen.getByText('الخطوة 1 من 2')).toBeTruthy();
  });

  test('shows the user email pulled from useGetMeQuery', () => {
    renderWizard();
    expect(screen.getByText('sara@example.com')).toBeTruthy();
  });

  test('shows validation errors when next is pressed with empty fields', () => {
    renderWizard();
    fireEvent.press(screen.getByText('التالي'));
    expect(screen.getByText('الاسم الأول مطلوب')).toBeTruthy();
    expect(screen.getByText('اسم العائلة مطلوب')).toBeTruthy();
    expect(screen.getByText('رقم الهاتف مطلوب')).toBeTruthy();
  });

  test('rejects an invalid phone format', () => {
    renderWizard();
    fireEvent.changeText(screen.getByPlaceholderText('مثال: سارة'), 'Sara');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: أحمد'), 'Tester');
    fireEvent.changeText(screen.getByPlaceholderText('05xxxxxxxx'), '123');
    fireEvent.press(screen.getByText('التالي'));
    expect(screen.getByText('رقم الهاتف غير صحيح')).toBeTruthy();
  });

  test('moves to Step 2 when fields are valid', () => {
    renderWizard();
    fireEvent.changeText(screen.getByPlaceholderText('مثال: سارة'), 'Sara');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: أحمد'), 'Tester');
    fireEvent.changeText(screen.getByPlaceholderText('05xxxxxxxx'), '0501234567');
    fireEvent.press(screen.getByText('التالي'));
    expect(screen.getByText('الخطوة 2 من 2')).toBeTruthy();
    expect(screen.getByText('المعلومات الصحية')).toBeTruthy();
  });
});

describe('CompleteProfileWizard - Step 2 / submit', () => {
  function advanceToStep2() {
    renderWizard();
    fireEvent.changeText(screen.getByPlaceholderText('مثال: سارة'), 'Sara');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: أحمد'), 'Tester');
    fireEvent.changeText(screen.getByPlaceholderText('05xxxxxxxx'), '0501234567');
    fireEvent.press(screen.getByText('التالي'));
  }

  test('on success: saves via patchMeFull, shows success toast, and does NOT navigate manually (RootNavigator swaps via conditional rendering)', async () => {
    // Regression guard. The old implementation called
    // navigation.navigate('CustomerTabs') after a successful save, which
    // triggered React Navigation's "action 'NAVIGATE' ... was not handled
    // by any navigator" warning -- at that moment RootNavigator only has
    // the wizard screen mounted (it renders Login / CompleteProfileWizard /
    // CustomerTabs conditionally on auth + profileCompleted). The correct
    // pattern with conditional rendering is to NOT navigate manually:
    // refetchMe() flips profileCompleted -> true, and RootNavigator swaps
    // the active screen to CustomerTabs on its own.
    advanceToStep2();
    fireEvent.changeText(screen.getByPlaceholderText('مثال: 28'), '28');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: 62'), '60');
    fireEvent.changeText(
      screen.getByPlaceholderText('اكتبي حالتك الصحية أو اذكري: لا يوجد'),
      'لا يوجد'
    );
    fireEvent.press(screen.getByText('حفظ وإنهاء'));

    // patchMeFull called exactly once with the typed/trimmed payload.
    await waitFor(() => {
      expect(mockPatchMeFullTrigger).toHaveBeenCalledTimes(1);
    });
    expect(mockPatchMeFullTrigger).toHaveBeenCalledWith({
      firstName: 'Sara',
      lastName: 'Tester',
      phone: '0501234567',
      age: 28,
      weight: 60,
      healthCondition: 'لا يوجد',
    });

    // Success toast is the user-visible signal of success.
    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text1: 'تم حفظ البيانات بنجاح',
        })
      );
    });

    // refetchMe is fired so RTK Query reloads /v1/me; once
    // profileCompleted flips true, RootNavigator swaps screens.
    await waitFor(() => {
      expect(mockRefetchMe).toHaveBeenCalled();
    });

    // The critical regression guard: NO manual navigate call. The wizard
    // must rely on RootNavigator's conditional rendering, not navigate().
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('CustomerTabs');
  });
});

describe('CompleteProfileWizard - C-STORE-03: consent line + Privacy/Terms links', () => {
  // C-STORE-03: this wizard is the point at which the app collects
  // profile + health data (age, weight, multi-line health condition).
  // Apple 5.1.1 / Play Data Safety requires a consent line referencing
  // Privacy + Terms at the moment of collection, with the policy
  // documents reachable via tappable links.
  //
  // Per Ahmed's decided scope, the consent line must:
  //   - reference Privacy + Terms by name ("سياسة الخصوصية" + "الشروط والأحكام")
  //   - expose two tappable links that call Linking.openURL with the
  //     hosted policy URLs (https).
  //
  // The implementer chooses placement. The most natural spot is Step 2
  // (the health-data step) right above the "حفظ وإنهاء" submit button,
  // but the contract here is only that the links render and dispatch
  // openURL somewhere in the wizard.

  beforeEach(() => {
    mockOpenURL.mockClear();
    mockCanOpenURL.mockClear();
  });

  function advanceToStep2() {
    renderWizard();
    fireEvent.changeText(screen.getByPlaceholderText('مثال: سارة'), 'Sara');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: أحمد'), 'Tester');
    fireEvent.changeText(screen.getByPlaceholderText('05xxxxxxxx'), '0501234567');
    fireEvent.press(screen.getByText('التالي'));
  }

  test(
    'C-STORE-03: Step 2 (health-data) renders a Privacy Policy link labeled "سياسة الخصوصية"',
    () => {
      advanceToStep2();
      expect(screen.getByText('سياسة الخصوصية')).toBeTruthy();
    }
  );

  test(
    'C-STORE-03: Step 2 (health-data) renders a Terms link labeled "الشروط والأحكام"',
    () => {
      advanceToStep2();
      expect(screen.getByText('الشروط والأحكام')).toBeTruthy();
    }
  );

  test(
    'C-STORE-03: pressing the Privacy link in the wizard calls Linking.openURL with an https URL',
    () => {
      advanceToStep2();
      fireEvent.press(screen.getByText('سياسة الخصوصية'));
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\//)
      );
    }
  );

  test(
    'C-STORE-03: pressing the Terms link in the wizard calls Linking.openURL with an https URL',
    () => {
      advanceToStep2();
      fireEvent.press(screen.getByText('الشروط والأحكام'));
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\//)
      );
    }
  );
});

describe('CompleteProfileWizard - AUTH_AUDIT 2026-06-10', () => {
  // Audit doc: ../../../../.claude/ops/AUTH_AUDIT_2026-06-10.md
  // Three remaining wizard findings (#8 medium, #15 low, #23 nit).

  function advanceToStep2WithValidStep1() {
    renderWizard();
    fireEvent.changeText(screen.getByPlaceholderText('مثال: سارة'), 'Sara');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: أحمد'), 'Tester');
    fireEvent.changeText(screen.getByPlaceholderText('05xxxxxxxx'), '0501234567');
    fireEvent.press(screen.getByText('التالي'));
  }

  function fillValidStep2() {
    fireEvent.changeText(screen.getByPlaceholderText('مثال: 28'), '28');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: 62'), '60');
    fireEvent.changeText(
      screen.getByPlaceholderText('اكتبي حالتك الصحية أو اذكري: لا يوجد'),
      'لا يوجد'
    );
  }

  // --- Finding #8 (MED) ---
  // Today CompleteProfileWizard.tsx:142 has `catch (_e)` and shows a SINGLE
  // opaque toast 'حدث خطأ أثناء حفظ البيانات' for every submit failure --
  // including a 400 / { data: { code: 'VALIDATION_ERROR' } }. The user sees
  // no hint about WHAT was wrong and the wizard re-enters the same broken
  // state on the next tap. The intended behavior (per the audit) is to
  // branch on the rejection shape: validation rejections (400 /
  // VALIDATION_ERROR) get an ACTIONABLE Arabic prompt distinct from the
  // generic message (e.g. text2 = 'تأكّدي من صحة البيانات...' or similar
  // "verify your inputs" wording). Network / 5xx may keep a generic
  // message -- the contract this guard pins is "the validation case
  // produces a message clearly different from the single opaque
  // 'حدث خطأ أثناء حفظ البيانات' string".
  test(
    'AUDIT #8: a 400 / VALIDATION_ERROR submit rejection shows an actionable Arabic toast distinct from the single opaque "حدث خطأ أثناء حفظ البيانات"',
    async () => {
      const validationErr = Object.assign(
        new Error('Request failed with status code 400'),
        {
          status: 400,
          data: {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: [{ path: ['phone'], message: 'invalid' }],
          },
        }
      );
      mockPatchMeFull.mockReset().mockRejectedValueOnce(validationErr);

      advanceToStep2WithValidStep1();
      fillValidStep2();
      fireEvent.press(screen.getByText('حفظ وإنهاء'));

      // Wait for *some* error toast to fire.
      await waitFor(() => {
        const errorCalls = mockToastShow.mock.calls.filter(
          (c) => c[0]?.type === 'error'
        );
        expect(errorCalls.length).toBeGreaterThan(0);
      });

      const errorCall = mockToastShow.mock.calls.find(
        (c) => c[0]?.type === 'error'
      )!;
      const payload = errorCall[0];

      // Contract: it MUST be something other than the single opaque
      // 'حدث خطأ أثناء حفظ البيانات' with no actionable hint. That can be
      // satisfied two ways:
      //   (a) text1 differs entirely from the generic message, OR
      //   (b) text1 is the generic message but text2 supplies an actionable
      //       hint pointing at the inputs.
      const OPAQUE = 'حدث خطأ أثناء حفظ البيانات';
      const text1: string = payload.text1 ?? '';
      const text2: string = payload.text2 ?? '';
      const isDifferentTitle = text1 && text1 !== OPAQUE;
      const hasActionableSubtext =
        text1 === OPAQUE && text2.trim().length > 0;
      expect(isDifferentTitle || hasActionableSubtext).toBe(true);
    }
  );

  // --- Finding #15 (LOW) ---
  // Today isValidPhone at CompleteProfileWizard.tsx:18 normalizes whitespace
  // then checks `startsWith('05') && length >= 9`. That accepts a 9-digit
  // '05xxxxxxx' (e.g. '051234567'), which DOES NOT match the server's
  // /^05\d{8}$/ (10 digits total). Fix: tighten to /^05\d{8}$/.
  //
  // The wizard surfaces the failure as the visible error string
  // 'رقم الهاتف غير صحيح'. We assert via the UI rather than importing the
  // helper directly so we're testing the user-visible behavior.
  test(
    'AUDIT #15: isValidPhone rejects 9-digit "051234567" and accepts 10-digit "0501234567" (server rule /^05\\d{8}$/)',
    () => {
      // 1) 9-digit phone: should be REJECTED (currently accepted -> wizard
      //    advances to Step 2 with no phone error).
      renderWizard();
      fireEvent.changeText(screen.getByPlaceholderText('مثال: سارة'), 'Sara');
      fireEvent.changeText(screen.getByPlaceholderText('مثال: أحمد'), 'Tester');
      fireEvent.changeText(
        screen.getByPlaceholderText('05xxxxxxxx'),
        '051234567' // 9 digits -- INVALID under the server rule
      );
      fireEvent.press(screen.getByText('التالي'));
      // Expect the visible "phone invalid" error to appear AND the wizard
      // to NOT have advanced to Step 2 (Step 1 fields still rendered).
      expect(screen.getByText('رقم الهاتف غير صحيح')).toBeTruthy();
      expect(screen.queryByText('الخطوة 2 من 2')).toBeNull();

      // 2) 10-digit phone: should be ACCEPTED (currently also accepted; this
      //    arm doesn't fail today but pins the positive case so a future
      //    over-tight regex doesn't reject real numbers).
      mockNavigate.mockReset();
      mockGoBack.mockReset();
      renderWizard();
      fireEvent.changeText(screen.getByPlaceholderText('مثال: سارة'), 'Sara');
      fireEvent.changeText(screen.getByPlaceholderText('مثال: أحمد'), 'Tester');
      fireEvent.changeText(
        screen.getByPlaceholderText('05xxxxxxxx'),
        '0501234567' // 10 digits -- VALID
      );
      fireEvent.press(screen.getByText('التالي'));
      expect(screen.queryByText('رقم الهاتف غير صحيح')).toBeNull();
      expect(screen.getByText('الخطوة 2 من 2')).toBeTruthy();
    }
  );

  // --- Finding #23 (NIT) ---
  // CompleteProfileWizard.tsx:91-106 handleExitToLogin does
  //   dispatch(logout()); resetToLogin();
  // back-to-back. authSlice.logout fires `void
  // SecureStore.deleteItemAsync(...)` for BOTH the access and refresh
  // tokens (authSlice.ts:55-68) -- fire-and-forget. On a force-quit between
  // dispatch and the next cold start, the tokens may still be on disk and a
  // userless session gets re-authed. Intended fix: AWAIT the token clears
  // before resetToLogin (the audit doc explicitly notes
  // "source-guard acceptable" here because the timing is hard to drive at
  // the React-Native test boundary -- the logout reducer's
  // deleteItemAsync calls are dispatched outside the React render tree).
  //
  // This guard mirrors the existing CLIENT-2.2 source-regex pattern in
  // this file. It checks that handleExitToLogin's body awaits something
  // before resetToLogin -- i.e. the code stops being a synchronous
  // dispatch+reset pair. When the fix lands the body will be `async`
  // and contain an `await` before resetToLogin().
  test(
    'AUDIT #23: handleExitToLogin awaits token clears before resetToLogin (source-guard acceptable per audit)',
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src: string = fs.readFileSync(
        path.join(__dirname, '..', 'CompleteProfileWizard.tsx'),
        'utf8'
      );

      // Find the handleExitToLogin definition body.
      // We match from `handleExitToLogin = useCallback(` through the closing
      // `, [...]);` of the useCallback call to isolate just that handler's
      // source -- so we don't accidentally pick up `await` from elsewhere
      // (e.g. handleSubmit's `await refetchMe()`).
      const match = src.match(
        /handleExitToLogin\s*=\s*useCallback\(([\s\S]*?)\n\s*\}\s*,\s*\[[^\]]*\]\s*\)\s*;/
      );
      expect(match).not.toBeNull();
      const body = match![1];

      // Contract: the handler must await something before calling
      // resetToLogin(). Today the body is a synchronous arrow with
      // `dispatch(logout()); resetToLogin();` and no `await` at all.
      // The fix makes the onPress handler async and awaits the token
      // clears (either by awaiting deleteItemAsync directly or by
      // awaiting a refactored thunk version of logout).
      const indexAwait = body.indexOf('await');
      const indexReset = body.indexOf('resetToLogin');
      expect(indexAwait).toBeGreaterThanOrEqual(0);
      expect(indexReset).toBeGreaterThan(indexAwait);
    }
  );
});

describe('CompleteProfileWizard - CLIENT-2.2: KeyboardAvoidingView', () => {
  // CLIENT-2.2: Step 2 has 3 inputs including a multi-line health-status
  // field. Without KeyboardAvoidingView the submit button is hidden behind
  // the keyboard on smaller iPhones.
  test(
    'CLIENT-2.2: wizard wraps content in KeyboardAvoidingView',
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'CompleteProfileWizard.tsx'),
        'utf8'
      );
      expect(src).toMatch(/KeyboardAvoidingView/);
    }
  );
});

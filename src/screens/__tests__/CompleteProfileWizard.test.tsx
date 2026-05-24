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

  test('calls patchMeFull and navigates to CustomerTabs on success', async () => {
    advanceToStep2();
    fireEvent.changeText(screen.getByPlaceholderText('مثال: 28'), '28');
    fireEvent.changeText(screen.getByPlaceholderText('مثال: 62'), '60');
    fireEvent.changeText(
      screen.getByPlaceholderText('اكتبي حالتك الصحية أو اذكري: لا يوجد'),
      'لا يوجد'
    );
    fireEvent.press(screen.getByText('حفظ وإنهاء'));

    await waitFor(() => {
      expect(mockPatchMeFullTrigger).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('CustomerTabs');
    });
  });
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

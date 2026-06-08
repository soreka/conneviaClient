// src/screens/Login/__tests__/Login.test.tsx
// Render-level tests for the Login screen. Validates loading/error states
// and the disabled-button gating coming out of useAuth.

// Mock the env module first — Login -> useAuth pulls it in transitively.
jest.mock('../../../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 'test-client-id',
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://test.api',
    API_URL: 'http://test.local',
  },
}));

// Mock useAuth: the Login screen calls `useAuth()` directly. Stubbing the
// hook isolates the screen from the Auth0 PKCE machine.
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRefreshMe = jest.fn();
let mockAuthState: {
  user: any;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
} = {
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
};
jest.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    accessToken: mockAuthState.accessToken,
    isLoading: mockAuthState.isLoading,
    error: mockAuthState.error,
    login: mockLogin,
    logout: mockLogout,
    refreshMe: mockRefreshMe,
  }),
}));

// Mock the Redux dispatch hook so we don't need a Provider.
const mockDispatch = jest.fn();
jest.mock('../../../app/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

// Mock the auth slice's setCredentials action (no-op) and the token util.
jest.mock('../../../features/auth/authSlice', () => ({
  setCredentials: (payload: any) => ({ type: 'auth/setCredentials', payload }),
}));
jest.mock('../../../utils/tokenUtils', () => ({
  decodeAccessToken: jest.fn(() => ({ role: 'customer' })),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import Login from '../index';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// C-STORE-03: stub Linking after react-native is loaded. We replace just
// the two methods we care about; everything else (LinearGradient native
// shim, etc) stays as jest-expo defaults.
const mockOpenURL = jest.fn(() => Promise.resolve());
const mockCanOpenURL = jest.fn(() => Promise.resolve(true));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN = require('react-native');
RN.Linking.openURL = mockOpenURL;
RN.Linking.canOpenURL = mockCanOpenURL;

const renderLogin = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <Login />
    </SafeAreaProvider>
  );

beforeEach(() => {
  mockLogin.mockReset();
  mockDispatch.mockReset();
  mockAuthState = {
    user: null,
    accessToken: null,
    isLoading: false,
    error: null,
  };
});

describe('Login screen', () => {
  test('renders the primary login button', () => {
    renderLogin();
    // The button label is set by LoginActionCard.
    expect(screen.getByText('تسجيل الدخول')).toBeTruthy();
  });

  test('calls useAuth.login when the primary button is pressed', () => {
    renderLogin();
    fireEvent.press(screen.getByText('تسجيل الدخول'));
    expect(mockLogin).toHaveBeenCalled();
  });

  test('shows an ActivityIndicator while loading and hides the label', () => {
    mockAuthState.isLoading = true;
    renderLogin();
    // The label is replaced by the spinner.
    expect(screen.queryByText('تسجيل الدخول')).toBeNull();
  });

  test('displays the error text when useAuth returns an error', () => {
    mockAuthState.error = 'فشل تسجيل الدخول';
    renderLogin();
    expect(screen.getByText('فشل تسجيل الدخول')).toBeTruthy();
  });

  test('dispatches setCredentials when both token and user are present', () => {
    mockAuthState.accessToken = 'tok-1';
    mockAuthState.user = { id: 'u1', email: 'sara@example.com', role: 'customer' };
    renderLogin();
    // The effect runs after mount.
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/setCredentials' })
    );
  });
});

describe('Login screen - C-STORE-03: Privacy Policy + Terms links (logged-out)', () => {
  // C-STORE-03: Apple reviewers must be able to open the Privacy Policy
  // and Terms WITHOUT logging in. Per Ahmed's decided scope, the logged-out
  // Login screen must expose two tappable links - "سياسة الخصوصية" and
  // "الشروط والأحكام" - each calling Linking.openURL with the hosted URL.
  //
  // The real Login UI lives under src/screens/Login/ (components
  // LoginHeader.tsx / LoginActionCard.tsx) - NOT the dead
  // src/features/auth/LoginScreen.tsx. The implementer is free to add
  // the links inside any of the existing Login subcomponents or in a new
  // sibling component, as long as they render and dispatch openURL.

  beforeEach(() => {
    mockOpenURL.mockClear();
    mockCanOpenURL.mockClear();
  });

  test(
    'C-STORE-03: logged-out Login screen renders a Privacy Policy link labeled "سياسة الخصوصية"',
    () => {
      renderLogin();
      expect(screen.getByText('سياسة الخصوصية')).toBeTruthy();
    }
  );

  test(
    'C-STORE-03: logged-out Login screen renders a Terms link labeled "الشروط والأحكام"',
    () => {
      renderLogin();
      expect(screen.getByText('الشروط والأحكام')).toBeTruthy();
    }
  );

  test(
    'C-STORE-03: pressing the Privacy Policy link calls Linking.openURL with an https URL',
    () => {
      renderLogin();
      fireEvent.press(screen.getByText('سياسة الخصوصية'));
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\//)
      );
    }
  );

  test(
    'C-STORE-03: pressing the Terms link calls Linking.openURL with an https URL',
    () => {
      renderLogin();
      fireEvent.press(screen.getByText('الشروط والأحكام'));
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\//)
      );
    }
  );
});

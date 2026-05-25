// src/auth/__tests__/useAuth.test.ts
// Tests for the Auth0 PKCE login state machine. Covers the happy path,
// SecureStore persistence, logout, and the known bugs from the review:
// duplicate token exchange (CLIENT-1.3), missing offline_access scope
// (CLIENT-1.2), and unguarded JWT logging (CLIENT-1.5).
//
// SAFETY: every dependency that would talk to a device or the network is
// mocked at the top of the file. `expo-auth-session`, `expo-secure-store`,
// `expo-constants` (via the env module), and the axios instance from
// `../api` are all stubbed.

// ---- Mocks (must come before importing useAuth) -----------------------------

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 'test-client-id',
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://test.api',
    API_URL: 'http://test.local',
  },
}));

// expo-auth-session - stub the hooks/functions useAuth depends on.
// Each mock exposes a jest.fn() so tests can configure return values
// and assert call arguments.
const mockExchangeCodeAsync: jest.Mock<any, any> = jest.fn();
const mockRefreshAsync: jest.Mock<any, any> = jest.fn();
const mockMakeRedirectUri: jest.Mock<string, any> = jest.fn(() => 'connevia://login-callback');
// Stable discovery reference so the response-handling useEffect doesn't
// see a new dep object every render.
const stableDiscovery = {
  authorizationEndpoint: 'https://test.auth0.com/authorize',
  tokenEndpoint: 'https://test.auth0.com/oauth/token',
};
const mockUseAutoDiscovery: jest.Mock<any, any> = jest.fn(() => stableDiscovery);
// useAuthRequest returns a 3-tuple [request, response, promptAsync].
// Tests can set these via `setAuthRequestState`.
//
// `freshRequestEachRender` mirrors the real expo-auth-session behavior: a
// new `request` object is created on every render. With it enabled, the
// useEffect that lists `request` in its deps refires on every render -
// reproducing the duplicate-exchange bug (CLIENT-1.3).
let authRequestState: {
  request: { codeVerifier?: string } | null;
  response: any;
  promptAsync: jest.Mock;
  freshRequestEachRender: boolean;
} = {
  request: { codeVerifier: 'verifier-1' },
  response: null,
  promptAsync: jest.fn(),
  freshRequestEachRender: false,
};
function setAuthRequestState(next: Partial<typeof authRequestState>) {
  authRequestState = { ...authRequestState, ...next };
}
const mockUseAuthRequest: jest.Mock<any[], any> = jest.fn(() => {
  const req = authRequestState.freshRequestEachRender
    ? { ...authRequestState.request }
    : authRequestState.request;
  return [req, authRequestState.response, authRequestState.promptAsync];
});

jest.mock('expo-auth-session', () => ({
  useAutoDiscovery: (...args: any[]) => mockUseAutoDiscovery(...args),
  useAuthRequest: (...args: any[]) => mockUseAuthRequest(...args),
  makeRedirectUri: (...args: any[]) => mockMakeRedirectUri(...args),
  exchangeCodeAsync: (...args: any[]) => mockExchangeCodeAsync(...args),
  refreshAsync: (...args: any[]) => mockRefreshAsync(...args),
}));

// Mock the axios instance + helpers so useAuth's `await api.post(...)` and
// `setAccessToken(...)` are observable and never hit the network.
const mockApiPost: jest.Mock<any, any> = jest.fn();
const mockApiGet: jest.Mock<any, any> = jest.fn();
const mockSetAccessToken: jest.Mock<any, any> = jest.fn();
const mockGetAccessToken: jest.Mock<any, any> = jest.fn();
jest.mock('../../api', () => ({
  api: {
    post: (...args: any[]) => mockApiPost(...args),
    get: (...args: any[]) => mockApiGet(...args),
  },
  setAccessToken: (...args: any[]) => mockSetAccessToken(...args),
  getAccessToken: (...args: any[]) => mockGetAccessToken(...args),
}));

// jwt-decode is referenced via tokenUtils.decodeAccessToken; stub it so
// the post-login verification block doesn't blow up on the fake token.
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(() => ({
    sub: 'auth0|abc',
    email: 'sara@example.com',
    'https://connevia.app/claims/role': 'customer',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })),
}));

// ---- Imports (after mocks) --------------------------------------------------

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';

// ---- Helpers ---------------------------------------------------------------

function makeBootstrapResponse(overrides: Partial<{ id: string; email: string; fullName: string; role: string; profileCompleted: boolean }> = {}) {
  return {
    data: {
      ok: true,
      me: {
        id: 'user-1',
        email: 'sara@example.com',
        fullName: 'Sara Tester',
        role: 'customer',
        profileCompleted: true,
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  mockExchangeCodeAsync.mockReset();
  mockRefreshAsync.mockReset();
  mockApiPost.mockReset();
  mockApiGet.mockReset();
  mockSetAccessToken.mockReset();
  mockGetAccessToken.mockReset();
  mockUseAuthRequest.mockClear();
  mockMakeRedirectUri.mockClear();
  setAuthRequestState({
    request: { codeVerifier: 'verifier-1' },
    response: null,
    promptAsync: jest.fn(),
    freshRequestEachRender: false,
  });
});

// ---- Tests -----------------------------------------------------------------

describe('useAuth - initial state', () => {
  test('starts with no token, no user, not loading', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useAuth - happy path login', () => {
  test('exchanges the code, persists the token, sets the user', async () => {
    setAuthRequestState({
      response: { type: 'success', params: { code: 'auth-code-123' } },
    });
    mockExchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockApiPost.mockResolvedValueOnce(makeBootstrapResponse());

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    expect(mockExchangeCodeAsync).toHaveBeenCalled();
    expect(mockSetAccessToken).toHaveBeenCalledWith('access-token-123');
    expect(mockApiPost).toHaveBeenCalledWith('/v1/me/bootstrap');
    expect(result.current.accessToken).toBe('access-token-123');
    expect(result.current.user).toMatchObject({
      id: 'user-1',
      email: 'sara@example.com',
      role: 'customer',
    });
    expect(result.current.error).toBeNull();
  });

  test('a failed bootstrap leaves the token but sets an error', async () => {
    setAuthRequestState({
      response: { type: 'success', params: { code: 'auth-code-456' } },
    });
    mockExchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-456',
    });
    mockApiPost.mockRejectedValueOnce(new Error('server-down'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.error).toBe('server-down');
    });
    expect(result.current.accessToken).toBe('access-token-456');
    expect(result.current.user).toBeNull();
  });

  test('ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED on bootstrap forces logout', async () => {
    setAuthRequestState({
      response: { type: 'success', params: { code: 'auth-code-789' } },
    });
    mockExchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-789',
    });
    mockApiPost.mockRejectedValueOnce({
      response: { data: { error: 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED' } },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.error).toBe('تم حذف الحساب');
    });
    expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
    expect(result.current.accessToken).toBeNull();
  });
});

describe('useAuth - logout', () => {
  test('clears SecureStore and resets in-memory state', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSetAccessToken).toHaveBeenCalledWith(null);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });
});

describe('useAuth - duplicate token exchange (CLIENT-1.3)', () => {
  // CLIENT-1.3: the response-handling effect lists `request` in its deps,
  // and `useAuthRequest` returns a new `request` object reference on every
  // render. When the parent re-renders, the effect re-fires with the same
  // `response.params.code` and `exchangeCodeAsync` is called a second time
  // -> Auth0 rejects the re-use, the user sees "login failed".
  //
  // Intended behavior: the same successful response is only exchanged once.
  //
  // Structural assertion: we read the file source and check the dep array
  // for the response-handling effect does NOT list `request`. This avoids
  // an OOM infinite-render loop that we cannot bound from inside a hook
  // test (each render of the buggy hook spawns another effect/exchange).
  test.failing(
    'CLIENT-1.3: useAuth.ts response-handling effect does not depend on `request`',
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'useAuth.ts'),
        'utf8'
      );
      // The buggy line currently reads:
      //   }, [response, discovery, redirectUri, request]);
      // Intended:
      //   }, [response, discovery, redirectUri]);
      // OR: capture codeVerifier via a ref keyed on `response.params.code`.
      const buggyDeps = /\[response,\s*discovery,\s*redirectUri,\s*request\]/;
      expect(src).not.toMatch(buggyDeps);
    }
  );
});

describe('useAuth - refresh token scope (CLIENT-1.2)', () => {
  // CLIENT-1.2: the auth request is built with scopes
  // ["openid", "profile", "email"] - no offline_access, so Auth0 will not
  // issue a refresh token and the session silently dies after ~1 hour.
  test.failing(
    'CLIENT-1.2: useAuthRequest is called with offline_access scope',
    () => {
      renderHook(() => useAuth());
      const firstCall = (mockUseAuthRequest.mock.calls as any[])[0];
      const firstCallArgs = firstCall?.[0] as { scopes?: string[] } | undefined;
      expect(firstCallArgs?.scopes).toContain('offline_access');
    }
  );
});

describe('useAuth - JWT logging (CLIENT-1.5)', () => {
  // CLIENT-1.5: the full tokenResponse object (which contains the access
  // token, id token, and decoded user PII) is logged unconditionally at
  // useAuth.ts:108. In production this leaks to whatever log aggregator
  // picks up console output.
  //
  // Intended: the log is gated behind __DEV__ AND, in dev, only metadata
  // (Object.keys, type, ...) is logged - never the raw token strings.
  test.failing(
    'CLIENT-1.5: access token is never passed to console.log',
    async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-log' } },
      });
      const TOKEN = 'access-token-log-leak';
      mockExchangeCodeAsync.mockResolvedValueOnce({ accessToken: TOKEN });
      mockApiPost.mockResolvedValueOnce(makeBootstrapResponse());

      renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalled();
      });

      // Look at every console.log call's arguments and ensure none
      // includes the raw access token string anywhere in its payload.
      const leaked = logSpy.mock.calls.some((args) =>
        args.some((a) => {
          if (typeof a === 'string') return a.includes(TOKEN);
          if (a && typeof a === 'object') {
            try {
              return JSON.stringify(a).includes(TOKEN);
            } catch {
              return false;
            }
          }
          return false;
        })
      );

      logSpy.mockRestore();
      expect(leaked).toBe(false);
    }
  );
});

describe('useAuth - redirect URI scheme (CLIENT-1.6)', () => {
  // CLIENT-1.6 (LAUNCH BLOCKER): useAuth.ts:50-51 hardcodes
  //   AuthSession.makeRedirectUri({ scheme: 'connevia', path: 'login-callback' })
  // but app.json:37 declares "scheme": "hayazmiro-studio" (the app was
  // rebranded) and the Auth0 dashboard allowed-callback list expects
  // `hayazmiro-studio://login-callback`. On a production/standalone EAS build
  // the OS only registers the `hayazmiro-studio://` scheme, so the OAuth
  // redirect never returns and login fails for 100% of users.
  //
  // Intended behavior: the redirect URI scheme must NOT be the stale
  // hardcoded 'connevia' literal. Preferred fix is to omit `scheme` entirely
  // (makeRedirectUri derives it from app.json) or read it from
  // Constants.expoConfig?.scheme. Either way the literal 'connevia' must not
  // survive.
  //
  // SOURCE-REGEX assertion (not a runtime value): the `expo-auth-session`
  // mock at the top of this file replaces makeRedirectUri, so the runtime
  // redirect URI never reflects the real scheme. The only assertion that
  // survives the mock is reading the useAuth.ts source directly, mirroring
  // the CLIENT-1.3 pattern above.
  test.failing(
    'CLIENT-1.6: redirect URI scheme is not the stale "connevia" literal (matches app.json)',
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'useAuth.ts'),
        'utf8'
      );

      // Primary guard: the makeRedirectUri(...) call must NOT pass the stale
      // `scheme: 'connevia'` literal. The buggy line currently reads:
      //   AuthSession.makeRedirectUri({ scheme: 'connevia', path: 'login-callback' })
      const staleSchemeLiteral =
        /makeRedirectUri\([^)]*scheme:\s*['"]connevia['"]/s;
      expect(src).not.toMatch(staleSchemeLiteral);

      // Stronger positive guard (kept secondary so the test isn't brittle):
      // IF a literal `scheme:` is still passed to makeRedirectUri, it must
      // equal the scheme declared in app.json. If no literal scheme is passed
      // (the preferred fix — derive from the manifest), this guard is a no-op.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const appScheme = require('../../../app.json').expo.scheme; // 'hayazmiro-studio'
      const literalSchemeMatch = src.match(
        /makeRedirectUri\([^)]*scheme:\s*['"]([^'"]+)['"]/s
      );
      if (literalSchemeMatch) {
        expect(literalSchemeMatch[1]).toBe(appScheme);
      }
    }
  );
});

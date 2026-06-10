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
// setRefreshToken/getRefreshToken are exported by api.ts (CLIENT-1.2
// scope-half). The implementer will soon wire setRefreshToken(...) into
// useAuth's login-success path; without these on the mock that call would
// throw `setRefreshToken is not a function` and break the happy-path test.
// Purely additive — no current test reads these.
const mockSetRefreshToken: jest.Mock<any, any> = jest.fn();
const mockGetRefreshToken: jest.Mock<any, any> = jest.fn();
jest.mock('../../api', () => ({
  api: {
    post: (...args: any[]) => mockApiPost(...args),
    get: (...args: any[]) => mockApiGet(...args),
  },
  setAccessToken: (...args: any[]) => mockSetAccessToken(...args),
  getAccessToken: (...args: any[]) => mockGetAccessToken(...args),
  setRefreshToken: (...args: any[]) => mockSetRefreshToken(...args),
  getRefreshToken: (...args: any[]) => mockGetRefreshToken(...args),
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
  mockSetRefreshToken.mockReset();
  mockGetRefreshToken.mockReset();
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

  test('a failed bootstrap clears both tokens and shows a friendly Arabic error', async () => {
    // Per AUTH_AUDIT_2026-06-10 Batch 1 (findings #7 / #16), bootstrap failures
    // no longer leave the freshly-minted token in place with a raw English
    // passthrough. The new contract: BOTH tokens are cleared (no half-logged-in
    // strand) and the error is a friendly Arabic string — never raw
    // `e.message` shrapnel like 'server-down' / 'Request failed' / 'Network'.
    setAuthRequestState({
      response: { type: 'success', params: { code: 'auth-code-456' } },
    });
    mockExchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-456',
      refreshToken: 'refresh-token-456',
    });
    mockApiPost.mockRejectedValueOnce(new Error('server-down'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // Both tokens cleared — no strand.
    expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
    expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);

    // Final state: user/token nulled out.
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();

    // Friendly Arabic — never the raw English shrapnel.
    const err = result.current.error ?? '';
    expect(typeof err).toBe('string');
    expect(err.length).toBeGreaterThan(0);
    expect(err).toMatch(/[؀-ۿ]/); // Arabic Unicode block
    expect(err).not.toContain('server-down');
    expect(err).not.toContain('Request failed');
    expect(err).not.toContain('Network');
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
  test(
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
  test(
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
  test(
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

describe('useAuth - cross-provider bootstrap collision (S-AUTH-04)', () => {
  // S-AUTH-04: server now returns 409 {ok:false, error:'Email already in use',
  // code:'EMAIL_IN_USE', provider:'google'|'apple'|'facebook'|'microsoft'|'email'|'<raw>'|'unknown'}
  // from POST /v1/me/bootstrap when a COMPLETED account with the same email
  // already exists under a different Auth0 provider.
  //
  // Current client (useAuth.ts:175-191) only special-cases
  // ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED via `response.data.error`. The new
  // `code: 'EMAIL_IN_USE'` falls through into the generic catch, which:
  //   - leaves the access token in place (user is half-logged-in / stuck), and
  //   - surfaces a raw 'request failed with status code 409' message.
  //
  // Intended client behavior on EMAIL_IN_USE:
  //   1. Clear BOTH the access token and the refresh token (setAccessToken(null),
  //      setRefreshToken(null)) so the user is returned cleanly to the login screen.
  //   2. state.user = null.
  //   3. state.error = a friendly, provider-named Arabic message that contains:
  //        - the provider's display name (provider:'google' -> 'Google'), and
  //        - the steer phrase 'يرجى تسجيل الدخول بنفس الطريقة'
  //      so the user knows WHICH method to re-use.
  //
  // Provider -> display-name mapping the implementer must mirror verbatim:
  //   google    -> 'Google'
  //   apple     -> 'Apple'
  //   facebook  -> 'Facebook'
  //   microsoft -> 'Microsoft'
  //   email     -> 'البريد الإلكتروني'
  //   <anything else / 'unknown'> -> 'مزود آخر'
  //
  // Suggested error string shape (the assertion below only pins the substrings
  // that matter — implementer may phrase the rest):
  //   `هذا البريد مسجّل مسبقاً عبر ${displayName}. يرجى تسجيل الدخول بنفس الطريقة.`
  test(
    'S-AUTH-04: bootstrap 409 EMAIL_IN_USE clears token and sets a provider-named error',
    async () => {
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-xprov' } },
      });
      mockExchangeCodeAsync.mockResolvedValueOnce({
        accessToken: 'access-token-xprov',
        refreshToken: 'refresh-token-xprov',
      });
      // Axios-shaped error mirroring the new server contract.
      mockApiPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            ok: false,
            error: 'Email already in use',
            code: 'EMAIL_IN_USE',
            provider: 'google',
          },
        },
        message: 'Request failed with status code 409',
      });

      const { result } = renderHook(() => useAuth());

      // Wait for the bootstrap-catch to settle into the final state.
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // (1) Token cleared — user is NOT left half-logged-in.
      expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
      // Refresh token must also be cleared (single-flight interceptor would
      // otherwise try to renew a session that the server just rejected).
      expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
      expect(result.current.accessToken).toBeNull();

      // (2) user is null.
      expect(result.current.user).toBeNull();

      // (3) Error is the provider-named Arabic message:
      //     - contains the provider display name 'Google' (from provider:'google'), and
      //     - contains the steer phrase 'يرجى تسجيل الدخول بنفس الطريقة'.
      // (We assert substrings rather than the exact string so the implementer
      // can phrase the surrounding copy without breaking the guard.)
      expect(result.current.error).toEqual(expect.stringContaining('Google'));
      expect(result.current.error).toEqual(
        expect.stringContaining('يرجى تسجيل الدخول بنفس الطريقة')
      );
    }
  );
});

// =============================================================================
// 2026-06-10 AUTH AUDIT — Batch 1 useAuth error-handling guards
// (`.claude/ops/AUTH_AUDIT_2026-06-10.md` — findings #2, #3, #4, #5, #7, #10,
//  #11, #14, #16).
//
// Two root themes the audit collapses these findings into:
//   (a) Raw English `error.message` is echoed verbatim onto an Arabic-first
//       Login screen ("Request failed with status code 500", "Network Error",
//       "timeout of 15000ms exceeded", "(error)"). The intended behavior is a
//       FIXED friendly Arabic string per branch, with the raw text only
//       __DEV__-logged.
//   (b) On ANY bootstrap-POST failure, useAuth currently keeps the just-minted
//       access token (and the refresh token in the offline_access world) while
//       leaving user=null — stranding the user half-logged-in (#3,#4,#5,#7,#16).
//       Intended: clear BOTH tokens (setAccessToken(null) + setRefreshToken(null))
//       so the user is returned cleanly to Login and the api.ts 401 single-flight
//       interceptor doesn't try to renew a rejected session.
//
// All guards below use test.failing because the corrected behavior is NOT YET
// IMPLEMENTED (the implementer will land Batch 1 next). Each guard's body
// asserts the INTENDED behavior; against today's code each assertion currently
// fails (so test.failing reports as passing). When Batch 1 lands the bodies
// will pass and Jest will report "Failing test passed even though it was
// supposed to fail" — the tester drops `.failing`.
//
// Substring strategy: we DO NOT pin the exact Arabic copy (the implementer may
// phrase the surrounding text). We pin (i) it does NOT contain the raw English
// shrapnel that today's code leaks, and (ii) the tokens are cleared. This
// keeps the guards stable across copy-polish edits.
// =============================================================================

describe('useAuth - bootstrap error handling (audit #3, #4, #5, #7, #14, #16)', () => {
  // A friendly Arabic string must NEVER contain any of these raw English
  // shrapnel substrings that today's `e.message`/`response.type` path leaks.
  const ENGLISH_LEAKS = [
    'Request failed',
    'Network',
    'timeout',
    'status code',
    'undefined',
    '(error)',
    'server-down',
    '[object Object]',
  ] as const;

  function assertFriendlyArabic(message: string | null | undefined) {
    expect(typeof message).toBe('string');
    expect(message).not.toBeNull();
    expect((message ?? '').length).toBeGreaterThan(0);
    // Must contain at least one Arabic character (Unicode block U+0600–U+06FF).
    expect(message).toMatch(/[؀-ۿ]/);
    for (const leak of ENGLISH_LEAKS) {
      expect(message ?? '').not.toContain(leak);
    }
  }

  test(
    'AUDIT-#3: bootstrap network error -> friendly Arabic + BOTH tokens cleared (no strand)',
    async () => {
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-net' } },
      });
      mockExchangeCodeAsync.mockResolvedValueOnce({
        accessToken: 'access-token-net',
        refreshToken: 'refresh-token-net',
      });
      // A bare axios "Network Error" — no `.response` (request never reached
      // the server). Today useAuth surfaces `e.message` ("Network Error") and
      // keeps the access token. Intended: friendly Arabic + both tokens cleared.
      mockApiPost.mockRejectedValueOnce(
        Object.assign(new Error('Network Error'), { isAxiosError: true })
      );

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      assertFriendlyArabic(result.current.error);
      // Token strand: both tokens MUST be cleared so the api.ts 401
      // interceptor cannot renew a rejected session.
      expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
      expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    }
  );

  test(
    'AUDIT-#4: bootstrap 5xx -> friendly Arabic + BOTH tokens cleared',
    async () => {
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-5xx' } },
      });
      mockExchangeCodeAsync.mockResolvedValueOnce({
        accessToken: 'access-token-5xx',
        refreshToken: 'refresh-token-5xx',
      });
      // Server-side crash: 500 with NO machine code (just `error` text).
      mockApiPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { ok: false, error: 'Internal server error' } },
        message: 'Request failed with status code 500',
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      assertFriendlyArabic(result.current.error);
      expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
      expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    }
  );

  test(
    'AUDIT-#5: bootstrap 15s timeout -> friendly Arabic + BOTH tokens cleared',
    async () => {
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-timeout' } },
      });
      mockExchangeCodeAsync.mockResolvedValueOnce({
        accessToken: 'access-token-timeout',
        refreshToken: 'refresh-token-timeout',
      });
      // Axios timeout shape — no `.response` and ECONNABORTED code.
      mockApiPost.mockRejectedValueOnce(
        Object.assign(new Error('timeout of 15000ms exceeded'), {
          isAxiosError: true,
          code: 'ECONNABORTED',
        })
      );

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      assertFriendlyArabic(result.current.error);
      expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
      expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    }
  );

  test(
    'AUDIT-#14: bootstrap 4xx WITHOUT a machine code -> friendly Arabic + BOTH tokens cleared',
    async () => {
      // 429 rate-limited with no `code` — must NOT echo .message.
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-429' } },
      });
      mockExchangeCodeAsync.mockResolvedValueOnce({
        accessToken: 'access-token-429',
        refreshToken: 'refresh-token-429',
      });
      mockApiPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 429, data: { ok: false, error: 'Too Many Requests' } },
        message: 'Request failed with status code 429',
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      assertFriendlyArabic(result.current.error);
      expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
      expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
      expect(result.current.user).toBeNull();
    }
  );

  test(
    'AUDIT-#7 + #16: bootstrap generic-Error -> user is null AND token cleared (no strand)',
    async () => {
      // Captures the broad strand class: any bootstrap rejection currently leaves
      // accessToken:access + user:null. Intended: cleared, no strand.
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-generic' } },
      });
      mockExchangeCodeAsync.mockResolvedValueOnce({
        accessToken: 'access-token-generic',
        refreshToken: 'refresh-token-generic',
      });
      mockApiPost.mockRejectedValueOnce(new Error('server-down'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // The strand: token must NOT remain set with user:null.
      // (Today: result.current.accessToken === 'access-token-generic'.)
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
      expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
      expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
      assertFriendlyArabic(result.current.error);
    }
  );

  test(
    'AUDIT (defensive): bootstrap 409 with code:EMAIL_REQUIRED -> friendly Arabic about email permission + tokens cleared',
    async () => {
      // Defensive guard for the server's future blank-email branch
      // (#12 in the audit: `bootstrapUser.ts:87` will reject with 422/409
      // EMAIL_REQUIRED instead of fabricating @unknown.local). The client must
      // handle it the same way as any other recognized failure: friendly
      // Arabic + clear both tokens. The message should mention email permission
      // (Arabic word "البريد" — "the email" — is the natural copy hook).
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-email-req' } },
      });
      mockExchangeCodeAsync.mockResolvedValueOnce({
        accessToken: 'access-token-email-req',
        refreshToken: 'refresh-token-email-req',
      });
      mockApiPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: { ok: false, error: 'Email required', code: 'EMAIL_REQUIRED' },
        },
        message: 'Request failed with status code 409',
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      assertFriendlyArabic(result.current.error);
      // Must reference the email (Arabic "البريد") so the user understands the
      // permission they need to re-grant in the social-login dialog.
      expect(result.current.error ?? '').toContain('البريد');
      expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
      expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    }
  );
});

describe('useAuth - outer effect-catch + response.type=error (audit #2, #10)', () => {
  const ENGLISH_LEAKS = [
    'Request failed',
    'Network',
    'timeout',
    'status code',
    'undefined',
    '(error)',
    '[object Object]',
  ] as const;

  function assertFriendlyArabic(message: string | null | undefined) {
    expect(typeof message).toBe('string');
    expect(message).not.toBeNull();
    expect((message ?? '').length).toBeGreaterThan(0);
    expect(message).toMatch(/[؀-ۿ]/);
    for (const leak of ENGLISH_LEAKS) {
      expect(message ?? '').not.toContain(leak);
    }
  }

  test(
    'AUDIT-#2: token-exchange failure (outer catch) -> friendly Arabic, never raw e.message',
    async () => {
      // Audit #2: `useAuth.ts:229-233` outer catch sets `error: e.message`
      // which today is "Request failed with status code 400" or
      // "Network Error" — echoed verbatim onto the Arabic-first Login screen.
      // Intended: a fixed friendly Arabic string; raw text only __DEV__-logged.
      setAuthRequestState({
        response: { type: 'success', params: { code: 'auth-code-exchange-fail' } },
      });
      mockExchangeCodeAsync.mockRejectedValueOnce(
        Object.assign(new Error('Request failed with status code 400'), {
          isAxiosError: true,
        })
      );

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      assertFriendlyArabic(result.current.error);
      // No strand: token must not be set, user must be null.
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    }
  );

  test(
    "AUDIT-#10: response.type==='error' -> friendly Arabic, NOT containing the raw '(error)' substring",
    async () => {
      // Audit #10: useAuth.ts:93-100 interpolates the raw `response.type`
      // ("error", "locked", ...) into the Arabic message ->
      // "فشل تسجيل الدخول (error)" which is half English shrapnel.
      // Intended: a fixed friendly Arabic string; raw type only __DEV__-logged.
      setAuthRequestState({
        // AuthSession may also include error_description in real life; we don't
        // require the impl to read it — just to NOT echo the raw `.type`.
        response: { type: 'error', error: { message: 'access_denied' } } as any,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      assertFriendlyArabic(result.current.error);
      // The current bug literally embeds "(error)" — must be gone.
      expect(result.current.error ?? '').not.toContain('(error)');
    }
  );
});

describe('useAuth - login() clears prior error at start (audit #11)', () => {
  // Audit #11: `useAuth.ts:94-101` — a prior error from a failed/cancelled
  // login persists across the next attempt. Intended: `login()` clears
  // `state.error` at the very start so the Login screen does not flash a
  // stale red banner while the next attempt is in flight.

  test(
    'AUDIT-#11: login() clears any previous state.error at its start',
    async () => {
      // Step 1: produce a previous error via a failed response (response.type
      // !== 'success'/'dismiss' -> sets state.error per useAuth.ts:94-100).
      setAuthRequestState({
        response: { type: 'error', error: { message: 'access_denied' } } as any,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Step 2: invoke login() — it should immediately clear state.error,
      // regardless of whether promptAsync ultimately succeeds. We don't
      // resolve promptAsync; we just check that the moment login() is awaited,
      // the prior error is gone.
      const slowPromptAsync = jest.fn(
        () => new Promise(() => {
          /* never resolves — we only care about the synchronous error clear */
        })
      );
      setAuthRequestState({ promptAsync: slowPromptAsync });

      // Fire login() but don't await it (it would hang). Then assert error
      // cleared on the next microtask.
      act(() => {
        void result.current.login();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    }
  );
});

// ---------------------------------------------------------------------------
// Regression guards (NOT .failing) — the audit fixes must not break either
// of the existing recognized-code branches.
// ---------------------------------------------------------------------------

describe('useAuth - existing recognized-code branches still pass (regression)', () => {
  test('REGRESSION: ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED still surfaces "تم حذف الحساب" + clears token', async () => {
    setAuthRequestState({
      response: { type: 'success', params: { code: 'auth-code-acct-del' } },
    });
    mockExchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-acct-del',
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
    expect(result.current.user).toBeNull();
  });

  test('REGRESSION: EMAIL_IN_USE still surfaces a provider-named Arabic message + clears BOTH tokens', async () => {
    setAuthRequestState({
      response: { type: 'success', params: { code: 'auth-code-xprov-reg' } },
    });
    mockExchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-xprov-reg',
      refreshToken: 'refresh-token-xprov-reg',
    });
    mockApiPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          ok: false,
          error: 'Email already in use',
          code: 'EMAIL_IN_USE',
          provider: 'apple',
        },
      },
      message: 'Request failed with status code 409',
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // Provider-named: 'apple' -> 'Apple' display name.
    expect(result.current.error).toEqual(expect.stringContaining('Apple'));
    expect(result.current.error).toEqual(
      expect.stringContaining('يرجى تسجيل الدخول بنفس الطريقة')
    );
    expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
    expect(mockSetRefreshToken).toHaveBeenLastCalledWith(null);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });
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
  test(
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

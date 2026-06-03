// src/__tests__/api.test.ts
// Tests for the axios instance, the request interceptor (bearer token
// attachment) and the response interceptor (401 ACCOUNT_DELETED handling
// plus refresh/retry semantics that are not yet implemented).
//
// SAFETY: axios-mock-adapter intercepts the axios instance before any
// request leaves the process. The real production URL
// (https://api.hayazmirostudio.com) MUST NOT be contacted.

// Mock expo-secure-store BEFORE importing api.ts so the SecureStore
// reference baked into api.ts and getAccessToken() is our mock.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock the env module so api.ts can initialize without expo-constants's
// real expoConfig. We use a sentinel non-production URL to make it obvious
// in any stack trace that this is the test build.
jest.mock('../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 'test-client-id',
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://test.api',
    API_URL: 'http://test.local',
  },
}));

// Mock expo-auth-session so the (not-yet-built) 401 refresh-and-retry
// interceptor's call to AuthSession.refreshAsync resolves SYNCHRONOUSLY and
// off the network. The REAL refreshAsync attempts a DNS/fetch to the Auth0
// token endpoint and rejects after ~10s, which would blow the 5s jest
// timeout for the CLIENT-1.2 retry test below. This mock makes the seam
// fast and network-safe (Production-safety guardrail: never hit real Auth0).
//
// `mockRefreshAsync` is exposed at module scope (mirroring `mockGetItem`)
// so the retry test can assert it was called exactly once once the
// interceptor lands. It resolves with a fresh token set.
const mockRefreshAsync = jest.fn(async (..._args: unknown[]) => ({
  accessToken: 'refreshed-access-token',
  refreshToken: 'rotated-refresh-token',
  issuedAt: Math.floor(Date.now() / 1000),
  expiresIn: 3600,
}));

jest.mock('expo-auth-session', () => ({
  refreshAsync: (...args: unknown[]) => mockRefreshAsync(...args),
}));

import MockAdapter from 'axios-mock-adapter';
import * as SecureStore from 'expo-secure-store';

import { api, getAccessToken, setAccessToken } from '../api';

const TOKEN_KEY = 'connevia.access_token';

const mockGetItem = SecureStore.getItemAsync as jest.MockedFunction<
  typeof SecureStore.getItemAsync
>;
const mockSetItem = SecureStore.setItemAsync as jest.MockedFunction<
  typeof SecureStore.setItemAsync
>;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

let mock: MockAdapter;

beforeEach(() => {
  // Fake timers so the 2-second setTimeout inside the 401 deleted-account
  // handler does not keep the Jest event loop alive after the test ends.
  jest.useFakeTimers();
  mock = new MockAdapter(api);
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockDeleteItem.mockReset();
  // Re-arm the refresh mock after the reset so the resolved token set
  // is restored for each test (mockReset clears the implementation).
  mockRefreshAsync.mockReset();
  mockRefreshAsync.mockResolvedValue({
    accessToken: 'refreshed-access-token',
    refreshToken: 'rotated-refresh-token',
    issuedAt: Math.floor(Date.now() / 1000),
    expiresIn: 3600,
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  mock.restore();
});

describe('getAccessToken / setAccessToken', () => {
  test('getAccessToken reads from SecureStore under the canonical key', async () => {
    mockGetItem.mockResolvedValueOnce('tok-abc');
    await expect(getAccessToken()).resolves.toBe('tok-abc');
    expect(mockGetItem).toHaveBeenCalledWith(TOKEN_KEY);
  });

  test('setAccessToken(token) writes to SecureStore', async () => {
    await setAccessToken('tok-xyz');
    expect(mockSetItem).toHaveBeenCalledWith(TOKEN_KEY, 'tok-xyz');
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  test('setAccessToken(null) deletes from SecureStore', async () => {
    await setAccessToken(null);
    expect(mockDeleteItem).toHaveBeenCalledWith(TOKEN_KEY);
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('request interceptor', () => {
  test('attaches Bearer token from SecureStore to outgoing requests', async () => {
    mockGetItem.mockResolvedValue('tok-bearer-1');
    mock.onGet('/v1/me').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer tok-bearer-1');
      return [200, { ok: true }];
    });

    const res = await api.get('/v1/me');
    expect(res.status).toBe(200);
  });

  test('omits Authorization header when no token is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    mock.onGet('/v1/me').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { ok: true }];
    });

    const res = await api.get('/v1/me');
    expect(res.status).toBe(200);
  });
});

describe('response interceptor - ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED', () => {
  test('clears the token on 401 with the deleted-account marker', async () => {
    mockGetItem.mockResolvedValue('tok-deleted');
    mock.onGet('/v1/me').reply(401, { error: 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED' });

    await expect(api.get('/v1/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(mockDeleteItem).toHaveBeenCalledWith(TOKEN_KEY);
  });

  test('does not clear the token on a generic 401 (today)', async () => {
    // This documents the *current* behavior: only the deleted-account marker
    // clears the token. Generic 401s (e.g. expired access token) are not
    // handled — see the .failing test for the intended refresh-and-retry.
    mockGetItem.mockResolvedValue('tok-expired');
    mock.onGet('/v1/me').reply(401, { error: 'TOKEN_EXPIRED' });

    await expect(api.get('/v1/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  // CLIENT-1.2: when the access token expires (generic 401), the client
  // should attempt a refresh via expo-auth-session and retry the original
  // request once. Today it just bubbles the 401 up; the user sees a logout.
  test(
    'CLIENT-1.2: generic 401 triggers refresh-and-retry once',
    async () => {
      mockGetItem.mockResolvedValue('tok-expired');

      // First call returns 401, second call (the retry after a refresh)
      // returns 200. The interceptor should make the second call
      // automatically.
      let calls = 0;
      mock.onGet('/v1/me').reply(() => {
        calls += 1;
        if (calls === 1) return [401, { error: 'TOKEN_EXPIRED' }];
        return [200, { ok: true, retried: true }];
      });

      const res = await api.get('/v1/me');
      expect(res.status).toBe(200);
      expect(calls).toBe(2);
      // Exactly one refresh fired for the single 401 (single-flight design).
      expect(mockRefreshAsync).toHaveBeenCalledTimes(1);
    }
  );

  // CLIENT-2.15: the `isHandlingDeletedAccount` flag should always be
  // reset, even if an exception interrupts the cleanup. Currently the
  // reset relies on a setTimeout that may not fire if other code throws
  // synchronously while the flag is set. The intended fix uses try/finally.
  //
  // The flag is module-local and not exposed; instead we observe its
  // effect: after a 401 deleted-account event, a *subsequent* 401 for the
  // same condition should still cause a token clear once the flag has
  // been reset.
  test(
    'CLIENT-2.15: isHandlingDeletedAccount flag resets after a handler error',
    async () => {
      mockGetItem.mockResolvedValue('tok-deleted-1');
      // Make setAccessToken's underlying delete throw, simulating a
      // SecureStore failure inside the handler.
      mockDeleteItem.mockRejectedValueOnce(new Error('secure-store-fail'));

      mock
        .onGet('/v1/me')
        .reply(401, { error: 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED' });

      await expect(api.get('/v1/me')).rejects.toBeDefined();

      // After the failing handler the flag should be cleared synchronously
      // (via try/finally). A second request that returns the same marker
      // should re-enter the handler and call deleteItemAsync again.
      mockDeleteItem.mockResolvedValueOnce(undefined);
      mock
        .onGet('/v1/me')
        .reply(401, { error: 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED' });

      await expect(api.get('/v1/me')).rejects.toBeDefined();
      // Flag was reset = handler re-entered on the second 401.
      //
      // Count = 3 because the C-AUTH-01 fix made the handler clear BOTH
      // SecureStore slots on each entry (access AND refresh):
      //   1. First handler entry: setAccessToken(null) → deleteItemAsync(TOKEN_KEY) → REJECTS.
      //      The throw propagates before setRefreshToken(null) runs. The try/finally
      //      still resets isHandlingDeletedAccount (CLIENT-2.15 invariant).
      //   2. Second handler entry: setAccessToken(null) → deleteItemAsync(TOKEN_KEY) → resolves.
      //   3. Second handler entry: setRefreshToken(null) → deleteItemAsync(REFRESH_TOKEN_KEY) → resolves.
      // If the flag had NOT reset (the bug this test exists to guard), entries
      // 2 and 3 would not happen and the count would be 1.
      expect(mockDeleteItem).toHaveBeenCalledTimes(3);

      // Sharpen the contract: the second entry must clear BOTH slots so the
      // refresh-token leak (C-AUTH-01) cannot resurface alongside this flag-
      // reset invariant.
      expect(mockDeleteItem).toHaveBeenCalledWith(TOKEN_KEY);
      expect(mockDeleteItem).toHaveBeenCalledWith('connevia.refresh_token');
    }
  );
});

describe('request timeout', () => {
  // CLIENT-2.7: axios instance has no `timeout` configured, so flaky
  // cellular connections leave requests hanging. Intended: at least
  // 15000 ms timeout.
  test(
    'CLIENT-2.7: axios instance has a request timeout configured',
    () => {
      // `api.defaults.timeout` is `0` (no timeout) today.
      expect(api.defaults.timeout).toBeGreaterThanOrEqual(15000);
    }
  );
});

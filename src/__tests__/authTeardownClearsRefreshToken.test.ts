// src/__tests__/authTeardownClearsRefreshToken.test.ts
//
// C-AUTH-01 (pre-ship audit 2026-06-03)
// ---------------------------------------------------------------------------
// INTENDED BEHAVIOR (pin):
//   Every reachable teardown path — i.e. the API-driven deleted-account 401
//   handler in `src/api.ts` and the user-initiated logout reducer in
//   `src/features/auth/authSlice.ts` — MUST clear BOTH SecureStore slots:
//     - `connevia.access_token` (already deleted today)
//     - `connevia.refresh_token` (NOT deleted today — this is the bug)
//
//   A long-lived Auth0 refresh token currently survives "log out" and
//   "delete account" on the device. On a shared/stolen device, the stale
//   refresh token can still be exchanged for fresh access tokens at the
//   Auth0 /oauth/token endpoint, defeating the user's logout intent and
//   leaving GDPR-deleted accounts with a still-mintable session.
//
//   Recommended single-source fix is a `clearAuthTokens()` helper that
//   both teardowns call. The test below is agnostic to where the helper
//   lives — it only asserts the OBSERVABLE contract on
//   `SecureStore.deleteItemAsync` (that both keys are deleted).
//
// SAFETY:
//   - expo-secure-store and expo-auth-session are mocked at module scope.
//   - axios-mock-adapter intercepts the axios instance BEFORE any request
//     leaves the process. The production URL
//     (https://api.hayazmirostudio.com) MUST NOT be contacted.

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 'test-client-id',
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://test.api',
    API_URL: 'http://test.local',
  },
}));

// expo-auth-session is touched only by api.ts module-level code; this mock
// keeps the import side-effect-free.
jest.mock('expo-auth-session', () => ({
  refreshAsync: jest.fn(),
}));

import MockAdapter from 'axios-mock-adapter';
import * as SecureStore from 'expo-secure-store';

import { api } from '../api';
import authReducer, { logout } from '../features/auth/authSlice';
import { configureStore } from '@reduxjs/toolkit';

const ACCESS_TOKEN_KEY = 'connevia.access_token';
const REFRESH_TOKEN_KEY = 'connevia.refresh_token';

const mockGetItem = SecureStore.getItemAsync as jest.MockedFunction<
  typeof SecureStore.getItemAsync
>;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

let mock: MockAdapter;

beforeEach(() => {
  // The api.ts deleted-account handler schedules nothing async-timer-wise,
  // but other parts of the suite use fake timers and we keep the pattern
  // consistent so this file does not flake when run interleaved.
  jest.useFakeTimers();
  mock = new MockAdapter(api);
  mockGetItem.mockReset();
  mockDeleteItem.mockReset();
  // Default: deletes resolve cleanly so the handler completes.
  mockDeleteItem.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  mock.restore();
});

describe('C-AUTH-01 — teardown clears BOTH access and refresh tokens', () => {
  // Baseline (documents current behavior): the deleted-account 401 path
  // DOES delete the access token. This test must remain green; it is the
  // anchor that proves the failing assertion below is about the REFRESH
  // token specifically, not about the access-token delete regressing.
  test('baseline: deleted-account 401 deletes the ACCESS token', async () => {
    mockGetItem.mockResolvedValue('tok-deleted');
    mock
      .onGet('/v1/me')
      .reply(401, { error: 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED' });

    await expect(api.get('/v1/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(mockDeleteItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
  });

  // Intended: same handler must ALSO clear the refresh token. Today only
  // setAccessToken(null) is called (api.ts:140), so the refresh-token slot
  // is left intact and a deleted account can still mint access tokens.
  test(
    'C-AUTH-01: deleted-account 401 ALSO deletes the REFRESH token',
    async () => {
      mockGetItem.mockResolvedValue('tok-deleted');
      mock
        .onGet('/v1/me')
        .reply(401, { error: 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED' });

      await expect(api.get('/v1/me')).rejects.toMatchObject({
        response: { status: 401 },
      });

      // Today this assertion fails because the api.ts handler never
      // touches REFRESH_TOKEN_KEY. The fix (clearAuthTokens helper or
      // an explicit deleteItemAsync(REFRESH_TOKEN_KEY) in the
      // deleted-account branch) will make this pass.
      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    }
  );

  // Baseline (documents current behavior): the logout reducer DOES delete
  // the access token via its `void SecureStore.deleteItemAsync(TOKEN_KEY)`
  // fire-and-forget. This anchor confirms the assertion below isolates
  // the REFRESH-token bug.
  test('baseline: authSlice.logout reducer deletes the ACCESS token', async () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(logout());
    // The reducer fires-and-forgets the SecureStore delete; let the
    // microtask queue drain.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockDeleteItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
  });

  // Intended: the logout reducer must clear the REFRESH token too. Today
  // authSlice.ts:58 only deletes ACCESS_TOKEN_KEY; nothing in the reducer
  // touches the refresh-token slot. Note the implementer is free to move
  // the SecureStore cleanup to a logoutThunk or to a `clearAuthTokens`
  // helper — what we assert here is the OBSERVABLE effect on
  // `deleteItemAsync` for the refresh-token key after `dispatch(logout())`.
  test(
    'C-AUTH-01: authSlice.logout teardown ALSO deletes the REFRESH token',
    async () => {
      const store = configureStore({ reducer: { auth: authReducer } });
      store.dispatch(logout());
      // Drain microtasks so any fire-and-forget SecureStore deletes settle.
      await Promise.resolve();
      await Promise.resolve();

      // Today this assertion fails: nothing in the reducer (or any
      // co-dispatched thunk wired by default) touches REFRESH_TOKEN_KEY.
      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    }
  );
});

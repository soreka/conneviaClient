// src/api.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";
import { ENV } from "./config/env";

const TOKEN_KEY = "connevia.access_token";
// CLIENT-1.2: the Auth0 refresh token lives in a SEPARATE SecureStore slot so it
// survives access-token rotation and can be used to renew the session silently.
const REFRESH_TOKEN_KEY = "connevia.refresh_token";

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAccessToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (__DEV__) {
      console.log('[Auth] SAVED token to SecureStore, key=', TOKEN_KEY, 'success=true');
    }
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    if (__DEV__) {
      console.log('[Auth] DELETED token from SecureStore, key=', TOKEN_KEY);
    }
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    if (__DEV__) {
      console.log('[Auth] SAVED refresh token to SecureStore, key=', REFRESH_TOKEN_KEY, 'success=true');
    }
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    if (__DEV__) {
      console.log('[Auth] DELETED refresh token from SecureStore, key=', REFRESH_TOKEN_KEY);
    }
  }
}

// Create one Axios instance for the whole app
export const api: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  // CLIENT-2.7: cap requests at 15s so flaky cellular connections cannot
  // leave the UI hanging on an indefinite spinner. Retry policy is
  // intentionally NOT added (POSTs must not auto-retry).
  timeout: 15000,
});

// Attach Authorization: Bearer <token> if available
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor to handle ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED error
// This is called when a deleted user tries to make any API request
let isHandlingDeletedAccount = false; // Prevent multiple logout attempts

// CLIENT-1.2: a config carries `_retry` once it has been retried after a
// silent token refresh, so a second 401 cannot loop forever.
type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

// CLIENT-1.2: single-flight refresh. The FIRST 401 starts the refresh and
// stores the promise here; any concurrent 401s await this SAME promise instead
// of each firing their own refresh (which would stampede Auth0 and rotate the
// refresh token multiple times). Cleared in a `finally` once it settles.
let refreshPromise: Promise<string> | null = null;

// CLIENT-1.2: perform the Auth0 token refresh exactly once across concurrent
// callers. Resolves with the new access token; rejects if no refresh token is
// stored or the refresh fails. On success it persists the new access token and
// any rotated refresh token to SecureStore.
async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      // No refresh token => cannot renew. Propagate so the original 401 stands.
      throw new Error('NO_REFRESH_TOKEN');
    }

    const result = await AuthSession.refreshAsync(
      {
        clientId: ENV.AUTH0_CLIENT_ID,
        refreshToken,
      },
      { tokenEndpoint: `https://${ENV.AUTH0_DOMAIN}/oauth/token` }
    );

    const newAccessToken = result.accessToken;
    if (!newAccessToken) {
      throw new Error('REFRESH_NO_ACCESS_TOKEN');
    }

    await setAccessToken(newAccessToken);
    // Auth0 may rotate the refresh token; persist the new one if returned.
    if (result.refreshToken) {
      await setRefreshToken(result.refreshToken);
    }

    return newAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorCode = error?.response?.data?.error;
    const statusCode = error?.response?.status;

    // Handle deleted/not-bootstrapped account - force logout.
    // This branch runs FIRST and unchanged: a deleted account must never be
    // sent down the generic refresh path below.
    if (statusCode === 401 && errorCode === 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED') {
      if (!isHandlingDeletedAccount) {
        isHandlingDeletedAccount = true;
        try {
          console.error('[API] ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED - forcing logout');

          // Clear token from SecureStore
          await setAccessToken(null);

          // Note: Navigation to Login is handled by RootNavigator watching auth state
          // The redux logout will be dispatched by the component that catches this error
        } finally {
          // CLIENT-2.15: always reset the flag, even if setAccessToken throws.
          // Reset is synchronous (not a setTimeout) so a subsequent deleted-account
          // 401 can re-enter the handler immediately. The flag still prevents
          // concurrent re-entry during the in-flight await above.
          isHandlingDeletedAccount = false;
        }
      }
      return Promise.reject(error);
    }

    // CLIENT-1.2: generic 401 (expired access token, NOT a deleted account).
    // Try to refresh the access token once and retry the original request.
    const originalConfig = error?.config as RetryableConfig | undefined;
    if (statusCode === 401 && originalConfig && !originalConfig._retry) {
      const refreshToken = await getRefreshToken();
      // No refresh token => no silent renewal possible; propagate the 401 so
      // the existing logout/redirect logic handles it (unchanged behavior).
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        const newAccessToken = await refreshAccessToken();

        // Retry the ORIGINAL request exactly once. Mark it so a second 401
        // after refresh does NOT loop. Set the bearer explicitly so the retry
        // doesn't depend on a SecureStore round-trip in the request interceptor.
        originalConfig._retry = true;
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;

        return api.request(originalConfig);
      } catch {
        // Refresh failed: clear tokens and let the existing logout/redirect
        // logic take over by propagating the original 401.
        await setAccessToken(null);
        await setRefreshToken(null);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

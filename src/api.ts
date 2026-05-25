// src/api.ts
import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorCode = error?.response?.data?.error;
    const statusCode = error?.response?.status;
    
    // Handle deleted/not-bootstrapped account - force logout
    if (statusCode === 401 && errorCode === 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED') {
      if (!isHandlingDeletedAccount) {
        isHandlingDeletedAccount = true;
        console.error('[API] ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED - forcing logout');
        
        // Clear token from SecureStore
        await setAccessToken(null);
        
        // Note: Navigation to Login is handled by RootNavigator watching auth state
        // The redux logout will be dispatched by the component that catches this error
        
        // Reset flag after a short delay to allow retry if needed
        setTimeout(() => {
          isHandlingDeletedAccount = false;
        }, 2000);
      }
    }
    
    return Promise.reject(error);
  }
);

// src/features/auth/authSlice.ts
// Role: Global auth state machine (token/user/isAuthenticated/isRestoring) used by navigation.
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from '../../app/store';
import { type UserRole, DEFAULT_ROLE } from '../../utils/tokenUtils';

const TOKEN_KEY = 'connevia.access_token';

export interface User {
  id: string;
  email?: string;
  role: 'consumer' | 'business' | 'admin';
}

interface AuthState {
  token: string | null;
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isRestoring: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  role: DEFAULT_ROLE,
  isAuthenticated: false,
  isRestoring: true, // Start as true to show splash while checking SecureStore
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: User; role: UserRole }>
    ) => {
      const { token, user, role } = action.payload;
      state.token = token;
      state.user = user;
      state.role = role;
      state.isAuthenticated = true;
      state.isRestoring = false;
      
      // Save token to SecureStore (async, fire and forget)
      void SecureStore.setItemAsync(TOKEN_KEY, token);
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.role = DEFAULT_ROLE;
      state.isAuthenticated = false;
      state.isRestoring = false;
      
      // Remove token from SecureStore (async, fire and forget)
      void SecureStore.deleteItemAsync(TOKEN_KEY);
    },
    // Action to restore session from SecureStore on app startup
    restoreSession: (
      state,
      action: PayloadAction<{ token: string; user: User; role: UserRole }>
    ) => {
      const { token, user, role } = action.payload;
      state.token = token;
      state.user = user;
      state.role = role;
      state.isAuthenticated = true;
      state.isRestoring = false;
    },
    // Action to finish restoring when no token is found
    finishRestoring: (state) => {
      state.isRestoring = false;
    },
  },
});

export const { setCredentials, logout, restoreSession, finishRestoring } = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectToken = (state: RootState) => state.auth.token;
export const selectIsRestoring = (state: RootState) => state.auth.isRestoring;
export const selectRole = (state: RootState) => state.auth.role;

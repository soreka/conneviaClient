// src/utils/tokenUtils.ts
// Role: Utility to decode JWT access token and extract role claim
import { jwtDecode } from 'jwt-decode';

// STANDARDIZED ROLES: Only "admin" or "customer" are valid
export type UserRole = 'admin' | 'customer';

export const ROLE_CLAIM = 'https://connevia.app/claims/role';
export const DEFAULT_ROLE: UserRole = 'customer';

/**
 * Normalize role from token/API to standard values.
 * Maps legacy "consumer" -> "customer" for backward compatibility.
 */
export function normalizeRole(rawRole: string | undefined): UserRole {
  if (rawRole === 'admin') return 'admin';
  if (rawRole === 'customer') return 'customer';
  // Legacy mapping: "consumer" -> "customer"
  if (rawRole === 'consumer') {
    if (__DEV__) {
      console.warn('[Auth] Legacy role "consumer" mapped to "customer"');
    }
    return 'customer';
  }
  // Default for any other value (including "business" or undefined)
  return DEFAULT_ROLE;
}

interface TokenPayload {
  sub?: string;
  email?: string;
  [ROLE_CLAIM]?: string;
  exp?: number;
  iat?: number;
}

export interface DecodedTokenInfo {
  userId: string;
  email?: string;
  role: UserRole;
  exp?: number;
  isExpired: boolean;
}

/**
 * Decodes the access token and extracts user info including role.
 * Returns null if token is invalid or cannot be decoded.
 */
export function decodeAccessToken(token: string): DecodedTokenInfo | null {
  try {
    const payload = jwtDecode<TokenPayload>(token);
    
    // Extract role from custom claim, normalize to standard values
    const rawRole = payload[ROLE_CLAIM];
    const role: UserRole = normalizeRole(rawRole);

    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;

    if (__DEV__) {
      console.log('[Auth] Decoded token:', { role, isExpired });
    }

    return {
      userId: payload.sub || '',
      email: payload.email,
      role,
      exp: payload.exp,
      isExpired,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[Auth] Failed to decode token:', error);
    }
    return null;
  }
}

/**
 * Extracts just the role from the token.
 * Returns 'customer' as default if token is invalid.
 */
export function extractRoleFromToken(token: string): UserRole {
  const decoded = decodeAccessToken(token);
  return decoded?.role ?? DEFAULT_ROLE;
}

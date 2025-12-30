// src/utils/tokenUtils.ts
// Role: Utility to decode JWT access token and extract role claim
import { jwtDecode } from 'jwt-decode';

export type UserRole = 'consumer' | 'business' | 'admin';

export const ROLE_CLAIM = 'https://connevia.app/claims/role';
export const DEFAULT_ROLE: UserRole = 'consumer';

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
    
    // Extract role from custom claim, default to 'consumer' if missing/invalid
    const rawRole = payload[ROLE_CLAIM];
    const validRoles: UserRole[] = ['admin', 'business', 'consumer'];
    const role: UserRole = validRoles.includes(rawRole as UserRole) 
      ? (rawRole as UserRole) 
      : DEFAULT_ROLE;

    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;

    // Log in dev mode
    if (__DEV__) {
      console.log('[Auth] Decoded token role:', role, 'expired:', isExpired);
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
 * Returns 'consumer' as default if token is invalid.
 */
export function extractRoleFromToken(token: string): UserRole {
  const decoded = decodeAccessToken(token);
  return decoded?.role ?? DEFAULT_ROLE;
}

import * as React from "react";
// Role: Local Auth0 login state machine (handles browser flow, token exchange, and /v1/auth/me for Login screen).
import * as AuthSession from "expo-auth-session";
import { ENV } from "../config/env";
import { setAccessToken, getAccessToken, api } from "../api";
import { normalizeRole, decodeAccessToken, ROLE_CLAIM } from "../utils/tokenUtils";

// What auth state we care about in the UI
type AuthState = Readonly<{
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}>;

type User = {
  id:string;
  email?:string;
  role: "admin" | "customer";
};


type UseAuthResult = Readonly<{
  accessToken: string | null;
  user:User| null
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}>;

export function useAuth(): UseAuthResult {
  const [state, setState] = React.useState<AuthState>({
    accessToken: null,
    user: null,
    isLoading: false,
    error: null,
  });

  // Note: Token restoration on app startup is now handled by RootNavigator bootstrap logic
  // This hook only manages Auth0 login flow and local state for the Login screen

  // 2) Discover Auth0 endpoints (authorize, token, etc.)
  const discovery = AuthSession.useAutoDiscovery(`https://${ENV.AUTH0_DOMAIN}`);

  // 3) Redirect URI – this should match what you put into Auth0
  const redirectUri = React.useMemo(
    () =>
      AuthSession.makeRedirectUri({
        path: "login-callback", // same path you used when you configured Callback URL
      }),
    []
  );

  // 4) Build an Auth Request (no network call yet)
  // prompt: "login" forces Auth0 to show login UI and issue fresh tokens
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: ENV.AUTH0_CLIENT_ID,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      extraParams: {
        audience: ENV.AUTH0_AUDIENCE,
        prompt: "login", // Force fresh login, bypass cached session
      },
    },
    discovery
  );

  // 5) Handle the response: if we get an authorization code, exchange it for tokens
  React.useEffect(() => {
    void (async () => {
      if (!response) return;
      if (response.type !== "success") {
        if (response.type !== "dismiss") {
          setState((prev) => ({
            ...prev,
            error: `Login was not successful (type = ${response.type})`,
          }));
        }
        return;
      }

      if (!discovery) return;

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const code = response.params.code;

        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: ENV.AUTH0_CLIENT_ID,
            code,
            redirectUri,
            extraParams: {
              audience: ENV.AUTH0_AUDIENCE,
              // PKCE secret generated for this request
              code_verifier: request?.codeVerifier!,
            },
          },
          discovery
        );
        console.log("Token response from Auth0:", tokenResponse);
        const access = tokenResponse.accessToken ?? null;

        if (__DEV__) {
          console.log('[Auth] useAuth - Got accessToken:', !!access);
        }

        // POST-LOGIN VERIFICATION: Decode token and log role claim
        if (access && __DEV__) {
          console.log('========================================');
          console.log('[Auth] POST-LOGIN TOKEN VERIFICATION');
          const decoded = decodeAccessToken(access);
          if (decoded) {
            console.log('[Auth] Token decoded successfully');
            console.log('[Auth] Role from token:', decoded.role);
            console.log('[Auth] User ID:', decoded.userId);
            console.log('[Auth] Email:', decoded.email);
            console.log('[Auth] Expired:', decoded.isExpired);
          } else {
            console.warn('[Auth] WARNING: Failed to decode token!');
          }
          console.log('========================================');
        }

        await setAccessToken(access);

        // Automatically fetch user from /v1/auth/me after getting token
        if (access) {
          try {
            const res = await api.get("/v1/auth/me");
            const { user: rawUser } = res.data as { user: User & { role?: string } };
            // Normalize role from server using centralized normalizeRole
            const user: User = {
              ...rawUser,
              role: normalizeRole(rawUser.role),
            };
            console.log("User fetched from /v1/auth/me:", user);
            setState({ accessToken: access, user, isLoading: false, error: null });
          } catch (meError: unknown) {
            const meMessage = meError instanceof Error ? meError.message : "Error fetching user from /v1/me";
            console.error("Failed to fetch user:", meMessage);
            // Still set token but without user
            setState({ accessToken: access, user: null, isLoading: false, error: meMessage });
          }
        } else {
          setState({ accessToken: access, user: null, isLoading: false, error: null });
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Unknown error during token exchange";
        setState({ accessToken: null, user : null , isLoading: false, error: message });
      }
    })();
  }, [response, discovery, redirectUri, request]);

  // 6) Public functions: login, logout, refreshMe

  const login = React.useCallback(async (): Promise<void> => {
    if (__DEV__) {
      console.log('[Auth] login() START');
      console.log('[Auth] login() request ready:', !!request);
      console.log('[Auth] login() discovery ready:', !!discovery);
    }

    if (!request) {
      if (__DEV__) {
        console.log('[Auth] login() ABORT - request not ready');
      }
      setState((prev) => ({
        ...prev,
        error: "Auth request is not ready yet. Try again in a moment.",
      }));
      return;
    }

    try {
      if (__DEV__) {
        console.log('[Auth] login() calling promptAsync()...');
      }
      // In Expo Go we typically use the proxy (default behavior)
      const result = await promptAsync();
      
      if (__DEV__) {
        console.log('[Auth] login() promptAsync returned:', {
          type: result?.type,
          hasParams: result?.type === 'success' ? !!(result as any).params : false,
          paramsKeys: result?.type === 'success' ? Object.keys((result as any).params || {}) : [],
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[Auth] login() ERROR:', error);
      }
      throw error;
    } finally {
      if (__DEV__) {
        console.log('[Auth] login() END');
      }
    }
  }, [promptAsync, request, discovery]);

  const logout = React.useCallback(async (): Promise<void> => {
    await setAccessToken(null);
    setState({ accessToken: null,user:null, isLoading: false, error: null });
  }, []);

  // Optional helper to call /v1/me and see if token works
  const refreshMe = React.useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const res = await api.get("/v1/auth/me");
      const { user: rawUser } = res.data as { user: User & { role?: string } };
      // Normalize role from server using centralized normalizeRole
      const user: User = {
        ...rawUser,
        role: normalizeRole(rawUser.role),
      };
      console.log("Me", user);
      setState((prev) => ({ ...prev, user, isLoading: false, error: null }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error calling /v1/me";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  return {
    accessToken: state.accessToken,
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    refreshMe,
  };
}

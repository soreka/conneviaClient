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

  // 3) Redirect URI – use scheme-based URI for stable callback across IP changes
  // This generates: connevia://login-callback (from app.json scheme)
  const redirectUri = React.useMemo(() => {
    const uri = AuthSession.makeRedirectUri({
      scheme: 'connevia',
      path: 'login-callback',
    });
    // Log on boot so we can copy-paste the exact URL for Auth0 dashboard
    console.log('[AUTH BOOT] redirectUri =', uri);
    return uri;
  }, []);

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
            error: `فشل تسجيل الدخول (${response.type})`,
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

        // Bootstrap user in MongoDB after getting Auth0 token
        // This is the ONLY place that can create users - ensures GDPR-compliant deletion works
        if (access) {
          try {
            const res = await api.post("/v1/me/bootstrap");
            const { me } = res.data as { ok: boolean; me: { id: string; email: string; fullName: string; role: string; profileCompleted: boolean } };
            // Normalize role from server using centralized normalizeRole
            const user: User = {
              id: me.id,
              email: me.email,
              role: normalizeRole(me.role),
            };
            console.log("User bootstrapped from /v1/me/bootstrap:", user);
            setState({ accessToken: access, user, isLoading: false, error: null });
          } catch (bootstrapError: unknown) {
            // Check for ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED error
            const axiosError = bootstrapError as any;
            const errorCode = axiosError?.response?.data?.error;
            
            if (errorCode === 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED') {
              console.error("[Auth] Account deleted or not bootstrapped - forcing logout");
              await setAccessToken(null);
              setState({ accessToken: null, user: null, isLoading: false, error: "تم حذف الحساب" });
              return;
            }
            
            const meMessage = bootstrapError instanceof Error ? bootstrapError.message : "فشل في جلب بيانات المستخدم";
            console.error("Failed to bootstrap user:", meMessage);
            // Still set token but without user
            setState({ accessToken: access, user: null, isLoading: false, error: meMessage });
          }
        } else {
          setState({ accessToken: access, user: null, isLoading: false, error: null });
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "خطأ غير معروف أثناء تسجيل الدخول";
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
        error: "جاري تحضير تسجيل الدخول، يرجى الانتظار",
      }));
      return;
    }

    try {
      if (__DEV__) {
        console.log('[Auth] login() calling promptAsync()...');
      }
      // Launch Auth0 login browser flow
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
      const res = await api.get("/v1/me");
      const { user: rawUser } = res.data as { user: User & { role?: string } };
      // Normalize role from server using centralized normalizeRole
      const user: User = {
        ...rawUser,
        role: normalizeRole(rawUser.role),
      };
      console.log("Me", user);
      setState((prev) => ({ ...prev, user, isLoading: false, error: null }));
    } catch (e: unknown) {
      // Check for ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED error
      const axiosError = e as any;
      const errorCode = axiosError?.response?.data?.error;
      
      if (errorCode === 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED') {
        console.error("[Auth] Account deleted or not bootstrapped - forcing logout");
        await setAccessToken(null);
        setState({ accessToken: null, user: null, isLoading: false, error: "تم حذف الحساب" });
        return;
      }
      
      const message = e instanceof Error ? e.message : "خطأ في جلب البيانات";
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

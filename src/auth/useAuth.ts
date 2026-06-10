import * as React from "react";
// Role: Local Auth0 login state machine (handles browser flow, token exchange, and /v1/auth/me for Login screen).
import * as AuthSession from "expo-auth-session";
import { ENV } from "../config/env";
import { setAccessToken, setRefreshToken, getAccessToken, api } from "../api";
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

// AUDIT 2026-06-10 #2/#3/#4/#5/#7/#10/#14/#16: never echo a raw English
// `error.message`/`response.type` onto the Arabic-first Login screen
// ("Request failed with status code 500", "Network Error", "timeout of
// 15000ms exceeded", "(error)"). Every failure path that surfaces an error
// to the UI MUST run through this mapper. The raw error is __DEV__-logged
// at the call site for debugging; the UI only ever sees a fixed friendly
// Arabic string.
const FRIENDLY_AUTH_ERROR_AR = "تعذّر إتمام تسجيل الدخول. يرجى المحاولة مرة أخرى.";
function toFriendlyAuthErrorMessage(_err: unknown): string {
  // Single fixed Arabic string — no interpolation of any raw value. Callers
  // that need a more specific message (EMAIL_IN_USE provider name,
  // EMAIL_REQUIRED, ACCOUNT_DELETED, ...) build their own copy and bypass
  // this helper.
  return FRIENDLY_AUTH_ERROR_AR;
}

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

  // 3) Redirect URI – derive the scheme from app.json (do NOT hardcode it).
  // makeRedirectUri reads the manifest scheme, so this produces
  // `<app.json scheme>://login-callback` (currently hayazmiro-studio://login-callback).
  // Hardcoding the scheme caused CLIENT-1.6: a stale `connevia://` literal that
  // breaks login on standalone/EAS builds where only the manifest scheme is registered.
  const redirectUri = React.useMemo(() => {
    const uri = AuthSession.makeRedirectUri({
      path: 'login-callback',
    });
    // Log on boot so we can copy-paste the exact URL for Auth0 dashboard
    if (__DEV__) {
      console.log('[AUTH BOOT] redirectUri =', uri);
    }
    return uri;
  }, []);

  // 4) Build an Auth Request (no network call yet)
  // prompt: "login" forces Auth0 to show login UI and issue fresh tokens
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: ENV.AUTH0_CLIENT_ID,
      redirectUri,
      // CLIENT-1.2: offline_access tells Auth0 to issue a refresh token so the
      // session can be renewed silently instead of dying ~1h after login.
      scopes: ["openid", "profile", "email", "offline_access"],
      extraParams: {
        audience: ENV.AUTH0_AUDIENCE,
        prompt: "login", // Force fresh login, bypass cached session
      },
    },
    discovery
  );

  // CLIENT-1.3: `request` gets a new object identity on every render of
  // useAuthRequest. Listing it in the response-handling effect's deps made the
  // effect re-fire and call exchangeCodeAsync twice for the same auth code,
  // which Auth0 rejects -> spurious "login failed". We capture the PKCE
  // codeVerifier in a ref (kept fresh each render) so we can read it inside the
  // effect without depending on `request` identity.
  const codeVerifierRef = React.useRef<string | undefined>(request?.codeVerifier);
  codeVerifierRef.current = request?.codeVerifier;

  // 5) Handle the response: if we get an authorization code, exchange it for tokens
  React.useEffect(() => {
    void (async () => {
      if (!response) return;
      if (response.type !== "success") {
        if (response.type !== "dismiss") {
          // AUDIT-#10: do NOT interpolate the raw `response.type`
          // ("error", "locked", ...) into the Arabic message — that produced
          // "فشل تسجيل الدخول (error)" (half English shrapnel). The raw type
          // is __DEV__-logged for debugging; the UI only sees the friendly
          // Arabic copy.
          if (__DEV__) {
            console.warn('[Auth] AuthSession response was not success:', response.type);
          }
          setState((prev) => ({
            ...prev,
            error: toFriendlyAuthErrorMessage(response),
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
              // PKCE secret generated for this request (read via ref so the
              // effect doesn't depend on `request`'s render identity — CLIENT-1.3)
              code_verifier: codeVerifierRef.current!,
            },
          },
          discovery
        );
        // CLIENT-1.5: never log the raw tokenResponse (contains access/id tokens + PII).
        // Even in dev, log only the metadata (which keys were returned).
        if (__DEV__) {
          console.log("Token response from Auth0 (keys):", Object.keys(tokenResponse));
        }
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

        // CLIENT-1.2: persist the refresh token (issued because of the
        // offline_access scope) in its own SecureStore slot so the api.ts 401
        // interceptor can silently renew the session. Never log the value.
        await setRefreshToken(tokenResponse.refreshToken ?? null);

        // Bootstrap user in MongoDB after getting Auth0 token
        // This is the ONLY place that can create users - ensures GDPR-compliant deletion works
        if (access) {
          try {
            const res = await api.post("/v1/me/bootstrap");
            // AUDIT-#22: the server also returns `subscriptionStatus` on the
            // bootstrap response (alongside id/email/fullName/role/
            // profileCompleted). Keep the inline type in sync with the
            // server contract — useful for downstream callers that read
            // res.data.me directly.
            const { me } = res.data as { ok: boolean; me: { id: string; email: string; fullName: string; role: string; profileCompleted: boolean; subscriptionStatus?: 'active' | 'inactive' } };
            // Normalize role from server using centralized normalizeRole
            const user: User = {
              id: me.id,
              email: me.email,
              role: normalizeRole(me.role),
            };
            if (__DEV__) {
              console.log("User bootstrapped from /v1/me/bootstrap:", { id: user.id, role: user.role });
            }
            setState({ accessToken: access, user, isLoading: false, error: null });
          } catch (bootstrapError: unknown) {
            // Check for ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED error
            const axiosError = bootstrapError as any;
            const errorCode = axiosError?.response?.data?.error;
            // S-AUTH-04: server now also returns 409 with `code:'EMAIL_IN_USE'`
            // + `provider:<slug>` when a COMPLETED account exists for this email
            // under a different Auth0 provider. Read both fields separately so
            // we can branch on the machine-readable `code` (not the human
            // `error` string) and steer the user back to the correct provider.
            const bootstrapCode = (bootstrapError as any)?.response?.data?.code;
            const bootstrapProvider = (bootstrapError as any)?.response?.data?.provider;

            // AUDIT-#21 (nit): this branch is currently DEAD on the bootstrap
            // path — `bootstrapUser` recreates a stub for any auth0Id it hasn't
            // seen before, so it never returns ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED
            // from POST /v1/me/bootstrap (that code is emitted by `requireUserDb`
            // on subsequent /v1/me reads). Kept for defense-in-depth in case
            // the server contract changes; do not remove without coordinating
            // with the server team.
            if (errorCode === 'ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED') {
              if (__DEV__) {
                console.warn("[Auth] Account deleted or not bootstrapped - forcing logout");
              }
              await setAccessToken(null);
              await setRefreshToken(null);
              setState({ accessToken: null, user: null, isLoading: false, error: "تم حذف الحساب" });
              return;
            }

            if (bootstrapCode === 'EMAIL_IN_USE') {
              // Same email is already registered under another provider. The
              // session we just minted is unusable, so clear BOTH tokens to
              // return cleanly to Login (otherwise api.ts's 401 single-flight
              // interceptor would try to renew a rejected session) and surface
              // a provider-named message so the user knows which method to
              // re-use.
              const providerDisplayName = (() => {
                switch (bootstrapProvider) {
                  case 'google':    return 'Google';
                  case 'apple':     return 'Apple';
                  case 'facebook':  return 'Facebook';
                  case 'microsoft': return 'Microsoft';
                  case 'email':     return 'البريد الإلكتروني';
                  default:          return 'مزود آخر';
                }
              })();
              const emailInUseMessage = `هذا البريد الإلكتروني مسجّل عبر ${providerDisplayName}. يرجى تسجيل الدخول بنفس الطريقة.`;
              if (__DEV__) {
                console.warn('[Auth] Bootstrap rejected - email already in use under provider:', bootstrapProvider);
              }
              await setAccessToken(null);
              await setRefreshToken(null);
              setState({ accessToken: null, user: null, isLoading: false, error: emailInUseMessage });
              return;
            }

            // AUDIT (defensive — server finding #12): when the server starts
            // rejecting blank-email tokens with `code:'EMAIL_REQUIRED'`
            // (instead of fabricating `<sub>@unknown.local` ghost accounts),
            // surface a friendly Arabic message that mentions "البريد" so the
            // user knows to re-grant email permission in the social-login
            // dialog. Clear both tokens — the session is unusable.
            if (bootstrapCode === 'EMAIL_REQUIRED') {
              if (__DEV__) {
                console.warn('[Auth] Bootstrap rejected - email permission missing on token');
              }
              await setAccessToken(null);
              await setRefreshToken(null);
              setState({
                accessToken: null,
                user: null,
                isLoading: false,
                error: 'لم نتمكن من قراءة البريد الإلكتروني الخاص بك. يرجى السماح بمشاركة البريد عند تسجيل الدخول.',
              });
              return;
            }

            // AUDIT-#3/#4/#5/#7/#14/#16: any other bootstrap failure
            // (network, timeout, 5xx, 4xx without a recognized code, generic
            // Error, ...) MUST NOT echo the raw `e.message` ("Network Error",
            // "Request failed with status code 500", "timeout of 15000ms
            // exceeded", "server-down") onto the Arabic Login screen, AND
            // MUST NOT leave the just-minted access/refresh tokens in
            // SecureStore — that strands the user half-logged-in and lets
            // api.ts's 401 interceptor try to renew a rejected session on
            // next cold start. Clear BOTH tokens + surface friendly Arabic.
            if (__DEV__) {
              console.warn('[Auth] Bootstrap failed (generic):', bootstrapError);
            }
            await setAccessToken(null);
            await setRefreshToken(null);
            setState({
              accessToken: null,
              user: null,
              isLoading: false,
              error: toFriendlyAuthErrorMessage(bootstrapError),
            });
          }
        } else {
          setState({ accessToken: access, user: null, isLoading: false, error: null });
        }
      } catch (e: unknown) {
        // AUDIT-#2: token-exchange / outer-effect failures (axios
        // "Request failed with status code 400", "Network Error", a thrown
        // string, ...) MUST NOT have `e.message` echoed onto the Arabic
        // Login screen. Clear both tokens (defense-in-depth — we may have
        // partially persisted before throwing) and surface friendly Arabic.
        if (__DEV__) {
          console.warn('[Auth] Login effect failed (outer catch):', e);
        }
        await setAccessToken(null);
        await setRefreshToken(null);
        setState({
          accessToken: null,
          user: null,
          isLoading: false,
          error: toFriendlyAuthErrorMessage(e),
        });
      }
    })();
  }, [response, discovery, redirectUri]);

  // 6) Public functions: login, logout, refreshMe

  const login = React.useCallback(async (): Promise<void> => {
    if (__DEV__) {
      console.log('[Auth] login() START');
      console.log('[Auth] login() request ready:', !!request);
      console.log('[Auth] login() discovery ready:', !!discovery);
    }

    // AUDIT-#11: clear any prior error BEFORE promptAsync so the Login
    // screen doesn't flash a stale red banner from a previous failed/
    // cancelled attempt while the new browser flow is in flight.
    setState((prev) => ({ ...prev, error: null }));

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
      if (__DEV__) {
        console.log("Me", { id: user.id, role: user.role });
      }
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

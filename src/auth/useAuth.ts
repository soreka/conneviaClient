import * as React from "react";
// Role: Local Auth0 login state machine (handles browser flow, token exchange, and /v1/auth/me for Login screen).
import * as AuthSession from "expo-auth-session";
import { ENV } from "../config/env";
import { setAccessToken, getAccessToken, api } from "../api";

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
  role:"consumer" | "business" | "admin"
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
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: ENV.AUTH0_CLIENT_ID,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      extraParams: {
        audience: ENV.AUTH0_AUDIENCE,
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

        await setAccessToken(access);

        // Automatically fetch user from /v1/auth/me after getting token
        if (access) {
          try {
            const res = await api.get("/v1/auth/me");
            const { user } = res.data as { user: User };
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
    if (!request) {
      setState((prev) => ({
        ...prev,
        error: "Auth request is not ready yet. Try again in a moment.",
      }));
      return;
    }

    // In Expo Go we typically use the proxy (default behavior)
    await promptAsync();
  }, [promptAsync, request]);

  const logout = React.useCallback(async (): Promise<void> => {
    await setAccessToken(null);
    setState({ accessToken: null,user:null, isLoading: false, error: null });
  }, []);

  // Optional helper to call /v1/me and see if token works
  const refreshMe = React.useCallback(async (): Promise<void> => {
    try {

      setState((prev) => ({ ...prev, isLoading: true }));
      const res = await api.get("/v1/auth/me");
      const { user } = res.data as {user: User};
      console.log("Me",user);
      setState((prev) => ({ ...prev, user:user,isLoading: false, error: null }));
      const token = await getAccessToken();
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

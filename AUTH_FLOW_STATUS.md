# Connevia Auth / Login Flow – Current Status

_Last updated: after Redux + navigation refactor with isRestoring and Auth0 auto-login_

## 1. High-Level Goal

- Maintain a **robust auth flow** that:
  - Logs in via **Auth0**.
  - Uses **/v1/auth/me** to get the user.
  - Persists the token in **SecureStore**.
  - Restores the session on **app reload** and routes directly to the **Tab navigator** when authenticated.

## 2. Main Files and Their Roles (State Machine View)

### 2.1 `src/features/auth/authSlice.ts` – Global Auth State Machine

- **Role comment in file:**
  - `// Role: Global auth state machine (token/user/isAuthenticated/isRestoring) used by navigation.`
- **State shape:**
  ```ts
  interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isRestoring: boolean;
  }
  ```
- **Initial state:**
  ```ts
  const initialState: AuthState = {
    token: null,
    user: null,
    isAuthenticated: false,
    isRestoring: true, // show splash while restoring from SecureStore
  };
  ```
- **Reducers / actions:**
  - `setCredentials({ token, user })`
    - Sets `state.token = token`, `state.user = user`.
    - Sets `state.isAuthenticated = true`.
    - Sets `state.isRestoring = false`.
    - Persists `token` to `expo-secure-store` under key `connevia.access_token`.
  - `logout()`
    - Clears `token` and `user`.
    - Sets `isAuthenticated = false`.
    - Sets `isRestoring = false`.
    - Deletes token from `SecureStore`.
  - `restoreSession({ token, user })` (currently not used in RootNavigator, but available)
    - Same effect as `setCredentials` but without writing token again.
  - `finishRestoring()`
    - Sets `isRestoring = false` without authenticating (used when no token or restore error).
- **Selectors:**
  - `selectCurrentUser(state) => state.auth.user`
  - `selectIsAuthenticated(state) => state.auth.isAuthenticated`
  - `selectToken(state) => state.auth.token`
  - `selectIsRestoring(state) => state.auth.isRestoring`

### 2.2 `src/navigation/RootNavigator.tsx` – Bootstrap + Router Brain

- **Role comment in file:**
  - `// Role: Bootstraps auth from SecureStore and routes between Login vs Tabs based on auth state.`
- **Key behavior:**
  - Uses `useAppDispatch`, `useAppSelector` with:
    - `selectIsAuthenticated`
    - `selectIsRestoring`
  - On mount, runs a **bootstrap effect**:
    ```ts
    useEffect(() => {
      const restoreSession = async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);

        if (token) {
          try {
            const res = await api.get('/v1/auth/me');
            const { user } = res.data as { user: User };
            dispatch(setCredentials({ token, user }));
          } catch (error) {
            // Token invalid / API error → not authenticated
            dispatch(finishRestoring());
          }
        } else {
          // No token → unauthenticated, but done restoring
          dispatch(finishRestoring());
        }
      };

      void restoreSession();
    }, [dispatch]);
    ```
  - While `isRestoring === true`:
    - Returns a **splash screen**: `View` + `ActivityIndicator`.
  - After `isRestoring === false`:
    ```tsx
    return (
      <Stack.Navigator headerShown={false}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={Login} />
        ) : (
          <Stack.Screen name="Tabs" component={TabNavigator} />
        )}
      </Stack.Navigator>
    );
    ```
- **Result:**
  - On **reload**, if a valid token is in `SecureStore` and `/v1/auth/me` works, the app goes **directly to Tabs** (after splash) instead of showing the Login screen.

### 2.3 `src/auth/useAuth.ts` – Local Auth0 Login State Machine

- **Role comment in file:**
  - `// Role: Local Auth0 login state machine (handles browser flow, token exchange, and /v1/auth/me for Login screen).`
- **Responsibilities:**
  - Manage Auth0 login flow via `expo-auth-session`.
  - Exchange code → token with `AuthSession.exchangeCodeAsync`.
  - After receiving the token, call `/v1/auth/me` to fetch the authenticated user.
  - Maintain **local hook state** for the Login screen:
    ```ts
    type AuthState = {
      accessToken: string | null;
      user: User | null;
      isLoading: boolean;
      error: string | null;
    };
    ```
- **Important note:**
  - **Startup restoration is now handled only by `RootNavigator`**, not by this hook.
  - The old effect that read `getAccessToken()` on mount was removed to avoid duplication.
- **Auth0 response handling effect:**
  - When `response` (from `useAuthRequest`) is a success:
    1. Exchange authorization code for access token.
    2. `await setAccessToken(access)` → writes to `SecureStore`.
    3. If `access` exists, call `api.get("/v1/auth/me")` to fetch `{ user }`.
    4. Set local `state = { accessToken: access, user, isLoading: false, error: null }`.
    5. If `/v1/auth/me` fails, still keep `accessToken` but `user = null` and set `error`.
- **Public API of hook:**
  ```ts
  return {
    accessToken: state.accessToken,
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,   // starts Auth0 flow
    logout,  // clears token from SecureStore + local state
    refreshMe, // optional: re-call /v1/auth/me
  };
  ```

### 2.4 `src/screens/Login.tsx` – Auth UI Station

- **Role comment in file:**
  - `// Role: Auth UI station that triggers Auth0 login via useAuth and syncs local auth state into Redux.`
- **Responsibilities:**
  - Present the **Login / Logout UI**.
  - Use `useAuth()` to:
    - Access `login`, `logout` functions.
    - Read `accessToken`, `user`, `isLoading`, `error` from local hook state.
  - Bridge `useAuth` → global Redux auth:
    ```ts
    useEffect(() => {
      if (accessToken && user) {
        dispatch(setCredentials({ token: accessToken, user }));
      }
    }, [accessToken, user, dispatch]);
    ```
  - UI logic:
    - If `isLoading` → show `ActivityIndicator`.
    - If `error` → show error text.
    - If `accessToken` is **truthy**:
      - Show "Logged in as ..." (if `user` is non-null).
      - Show **Logout** button.
    - Else:
      - Show **"Login with Auth0"** button which calls `login()`.
- **Logout handler:**
  ```ts
  const handleLogout = async () => {
    await logout();        // from useAuth: clears token in SecureStore + local state
    dispatch(logoutAction()); // from authSlice: clears Redux + SecureStore
  };
  ```

## 3. Auth Flow Scenarios

### 3.1 App Startup / Reload with Valid Token

1. Redux initial state:
   ```ts
   auth = {
     token: null,
     user: null,
     isAuthenticated: false,
     isRestoring: true,
   };
   ```
2. `RootNavigator` mounts:
   - `isRestoring === true` → shows splash screen.
   - `restoreSession` effect runs:
     - Reads token from `SecureStore`.
     - If token exists:
       - Calls `/v1/auth/me` via `api` (Axios with Authorization header from SecureStore).
       - On success: dispatches `setCredentials({ token, user })`.
     - On no token or error: dispatches `finishRestoring()`.
3. After restoration:
   - If successful:
     ```ts
     auth = {
       token,
       user,
       isAuthenticated: true,
       isRestoring: false,
     };
     ```
     → `RootNavigator` renders **Tabs**.
   - If failed / no token:
     ```ts
     auth = {
       token: null,
       user: null,
       isAuthenticated: false,
       isRestoring: false,
     };
     ```
     → `RootNavigator` renders **Login**.

### 3.2 First-Time Login via Auth0 from Login Screen

1. User sees **Login screen** (because `isAuthenticated === false`).
2. In `Login.tsx`, user taps **"Login with Auth0"**:
   - Calls `login()` from `useAuth`.
   - `useAuth` calls `promptAsync()` → opens Auth0 browser UI.
3. After Auth0 success:
   - `response.type === "success"`.
   - `useAuth` effect exchanges the auth code for an access token.
   - `setAccessToken(access)` stores the token in `SecureStore`.
   - `api.get("/v1/auth/me")` fetches the user.
   - Sets hook state: `{ accessToken: access, user, isLoading: false, error: null }`.
4. `Login.tsx` `useEffect` sees `accessToken && user`:
   - Dispatches `setCredentials({ token: accessToken, user })`.
   - Redux becomes authenticated (`isAuthenticated = true`, `isRestoring = false`).
5. `RootNavigator` sees `isAuthenticated === true`:
   - Switches to **TabNavigator**.

### 3.3 Logout

1. User taps **Logout** button in `Login.tsx` (if shown) or in another place wired to `logoutAction`.
2. `handleLogout`:
   - Calls `useAuth.logout()` → clears token from `SecureStore` and hook state.
   - Dispatches `logoutAction()` → clears Redux `auth` and token from `SecureStore`.
3. Redux state becomes unauthenticated.
4. `RootNavigator` re-renders and shows the **Login** screen.

## 4. Mental Model / Nicknames

- `authSlice.ts` – **"Truth Keeper"**
  - Holds the **global truth** about auth (token, user, restoring, authenticated).
- `RootNavigator.tsx` – **"Gatekeeper"**
  - On startup, decides whether you go to **Login** or **Tabs**, showing a splash in between.
- `useAuth.ts` – **"Auth0 Driver"**
  - Drives the Auth0 browser flow and `/v1/auth/me` for the Login screen.
- `Login.tsx` – **"Auth Station UI"**
  - The UI where the user taps Login / Logout and that syncs `useAuth` state into Redux.

## 5. Current Known Status

- ✅ Token & user are persisted via `SecureStore` and Redux.
- ✅ On app reload, if a valid token is present and `/v1/auth/me` works, the app:
  - Shows a splash while restoring.
  - Then navigates directly to **TabNavigator**, not back to Login.
- ✅ Login flow from `Login.tsx` → `useAuth` → Redux → `RootNavigator` is consistent.
- ✅ Logout clears both local hook state and Redux + `SecureStore`.

This file is intended to give another AI (or future you) a quick, accurate picture of the current auth/login architecture and recent changes, so it can safely build on top of this without re-discovering the flow.

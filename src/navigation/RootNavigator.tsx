// src/navigation/RootNavigator.tsx
// Role: Bootstraps auth from SecureStore and routes between Login vs Tabs based on auth state and role.
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { selectIsAuthenticated, selectIsRestoring, selectRole, restoreSession, finishRestoring, logout } from '../features/auth/authSlice';
import { decodeAccessToken } from '../utils/tokenUtils';
import { TabNavigator } from './TabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import Login from '../screens/Login';
import CompleteProfileWizard from '../screens/CompleteProfileWizard';
import { useGetMeQuery } from '../features/api/apiSlice';

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" />
  </View>
);

// AUTH_AUDIT_2026-06-10 #1: when `GET /v1/me` errors (network / 5xx /
// offline) the customer would previously stare at a bare ActivityIndicator
// forever — RTK Query auto-refetch on remount/focus/reconnect is NOT wired
// (setupListeners is never called, no refetchOn* flags). This screen is the
// guaranteed escape: Arabic copy + a Retry button wired to the
// `useGetMeQuery().refetch` from the parent navigator.
interface MeErrorRetryScreenProps {
  onRetry: () => void;
}

const MeErrorRetryScreen: React.FC<MeErrorRetryScreenProps> = ({ onRetry }) => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingHorizontal: 24,
    }}
  >
    <Text
      style={{
        fontSize: 16,
        color: '#374151',
        textAlign: 'center',
        marginBottom: 20,
        writingDirection: 'rtl',
      }}
    >
      تعذّر تحميل بياناتك، تحقّق من اتصالك
    </Text>
    <Pressable
      onPress={onRetry}
      style={({ pressed }) => ({
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
        إعادة المحاولة
      </Text>
    </Pressable>
  </View>
);

const TOKEN_KEY = 'connevia.access_token';

export type RootStackParamList = {
  Login: undefined;
  CompleteProfileWizard: undefined;
  CustomerTabs: undefined;
  AdminTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRestoring = useAppSelector(selectIsRestoring);
  const role = useAppSelector(selectRole);

  // Fetch DB profile (only when authenticated)
  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
    refetch,
  } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  // AUTH_AUDIT_2026-06-10 #6: branch the admin/customer route on the SERVER
  // role (`meData.user.role`) rather than the JWT-decoded role from the
  // Redux slice. The slice value remains the fallback for the pre-meData
  // window (cold-start, first paint after login) so admins still land on
  // the right tabs without waiting for the `/v1/me` round-trip — but once
  // the server response arrives, it wins, so an admin whose Auth0 token is
  // missing the role claim is no longer mis-routed to CustomerTabs.
  const effectiveRole = meData?.user?.role ?? role;

  // AUTH_AUDIT_2026-06-10 #1: user-invoked retry for the `GET /v1/me`
  // error escape screen. Wired below via the `meCannotBeDetermined` arm.
  const handleRetry = () => refetch();

  // Bootstrap auth from SecureStore on app startup.
  //
  // AUTH_AUDIT_2026-06-10 #17: the "failed to decode" branch must do a
  // FULL teardown (`logout()` — clears BOTH SecureStore slots + resets
  // auth state to defaults) rather than only deleting the access-token
  // slot + `finishRestoring()`. The expired-token branch already does this
  // — `finishRestoring()` is reserved here for the only path where there's
  // genuinely nothing to tear down: no token was stored at all.
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);

        if (!token) {
          dispatch(finishRestoring());
          return;
        }

        const decoded = decodeAccessToken(token);

        if (!decoded) {
          // AUTH_AUDIT_2026-06-10 #17: corrupted/undecodable stored access
          // token. Full teardown via `logout()` — its reducer clears both
          // SecureStore slots (access + refresh) and resets isRestoring +
          // auth state to defaults.
          console.error('[Auth] Failed to decode stored token');
          dispatch(logout());
          return;
        }

        if (decoded.isExpired) {
          if (__DEV__) console.log('[Auth] Stored token expired, clearing');
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          dispatch(logout());
          return;
        }

        const user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };

        if (__DEV__) console.log('[Auth] Session restored', { role: decoded.role });
        dispatch(restoreSession({ token, user, role: decoded.role }));
      } catch (error) {
        console.error('[Auth] Error reading token from SecureStore:', error);
        dispatch(finishRestoring());
      }
    };

    void bootstrapAuth();
  }, [dispatch]);

  const needsProfileCompletion =
    isAuthenticated &&
    effectiveRole !== 'admin' &&
    meData?.user &&
    meData.user.profileCompleted === false;

  // Show splash screen while restoring session
  if (isRestoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Route based on auth state and role.
  // C-STATE-02: a getMe error (network timeout / 5xx / offline) leaves
  // `meData === undefined` and `isMeLoading === false`. Without an
  // error-aware branch, the navigator would fall through to CustomerTabs
  // and an incomplete-profile customer would bypass the
  // CompleteProfileWizard. AUTH_AUDIT_2026-06-10 #1 replaced the previous
  // bare-LoadingScreen placeholder (which had no self-heal path — RTK
  // Query's auto-refetch listeners are not wired) with the
  // `MeErrorRetryScreen` defined above, which gives the user a manual
  // refetch button.
  const meCannotBeDetermined =
    isAuthenticated &&
    effectiveRole !== 'admin' &&
    (isMeError || meError || (!meData && !isMeLoading));

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={Login} />
      ) : effectiveRole === 'admin' ? (
        <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      ) : isMeLoading ? (
        <Stack.Screen name="CustomerTabs" component={LoadingScreen} />
      ) : meCannotBeDetermined ? (
        <Stack.Screen name="CustomerTabs">
          {() => <MeErrorRetryScreen onRetry={handleRetry} />}
        </Stack.Screen>
      ) : needsProfileCompletion ? (
        <Stack.Screen name="CompleteProfileWizard" component={CompleteProfileWizard} />
      ) : (
        <Stack.Screen name="CustomerTabs" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
};

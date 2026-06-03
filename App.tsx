import React, { useEffect, useState } from "react";
import "./global.css";
import { View, ActivityIndicator, Text } from "react-native";
import { verifyInstallation } from 'nativewind';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { store } from './src/app/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { logout } from './src/features/auth/authSlice';

// ============================================
// DEV-ONLY: Force Logout on Start
// To enable: set EXPO_PUBLIC_FORCE_LOGOUT_ON_START=true in .env (DEV only)
// Default: OFF - normal auth bootstrap runs
// ============================================
const FORCE_LOGOUT_ON_START =
  __DEV__ && process.env.EXPO_PUBLIC_FORCE_LOGOUT_ON_START === 'true';

const TOKEN_KEY = 'connevia.access_token';

function AuthResetGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!FORCE_LOGOUT_ON_START);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!FORCE_LOGOUT_ON_START) return;

    const runReset = async () => {
      if (__DEV__) {
        console.log('========================================');
        console.log('[DEV] FORCE_LOGOUT_ON_START enabled - clearing auth...');
        console.log('========================================');
      }

      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        dispatch(logout());
        if (__DEV__) {
          console.log('[DEV] Auth reset complete. App will show Login.');
        }
      } catch (error) {
        if (__DEV__) console.error('[DEV] Error during reset:', error);
      } finally {
        setReady(true);
      }
    };

    void runReset();
  }, [dispatch]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
          Resetting auth state...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function App() {
  // NativeWind setup-only diagnostic — never run in release builds (C-UX-03).
  if (__DEV__) {
    verifyInstallation();
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AuthResetGate>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              if (__DEV__) console.log('[Nav] CONTAINER READY');
            }}
            onStateChange={() => {
              if (__DEV__) console.log('[Nav] STATE route =', navigationRef.getCurrentRoute()?.name);
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </AuthResetGate>
      </SafeAreaProvider>
    </Provider>
  );
}

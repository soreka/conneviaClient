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
// AUTH RESET MODE
// Set to true to force-clear all stored tokens on app startup.
// This fixes stuck login / wrong role issues caused by stale tokens.
// Set back to false after successful test.
// ============================================
const AUTH_RESET_MODE = true;

const TOKEN_KEY = 'connevia.access_token';

function AuthResetGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!AUTH_RESET_MODE);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!AUTH_RESET_MODE) return;

    const runReset = async () => {
      console.log('========================================');
      console.log('[AUTH RESET MODE] Starting forced reset...');
      console.log('========================================');

      try {
        // 1) Check if token exists
        const existingToken = await SecureStore.getItemAsync(TOKEN_KEY);
        console.log('[AUTH RESET] Token existed before delete:', !!existingToken);
        if (existingToken) {
          console.log('[AUTH RESET] Token length:', existingToken.length);
        }

        // 2) Delete token from SecureStore
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        console.log('[AUTH RESET] Token deleted from SecureStore ✓');

        // 3) Dispatch logout to clear Redux state
        dispatch(logout());
        console.log('[AUTH RESET] Redux logout() dispatched ✓');

        console.log('========================================');
        console.log('[AUTH RESET MODE] Reset complete. App will show Login.');
        console.log('========================================');
      } catch (error) {
        console.error('[AUTH RESET] Error during reset:', error);
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
  verifyInstallation();
  
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

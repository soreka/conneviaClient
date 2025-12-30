// src/navigation/RootNavigator.tsx
// Role: Bootstraps auth from SecureStore and routes between Login vs Tabs based on auth state and role.
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { selectIsAuthenticated, selectIsRestoring, selectRole, restoreSession, finishRestoring, logout } from '../features/auth/authSlice';
import { decodeAccessToken } from '../utils/tokenUtils';
import { TabNavigator } from './TabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import Login from '../screens/Login';

const TOKEN_KEY = 'connevia.access_token';

export type RootStackParamList = {
  Login: undefined;
  CustomerTabs: undefined;
  AdminTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRestoring = useAppSelector(selectIsRestoring);
  const role = useAppSelector(selectRole);

  // Bootstrap: Restore session from SecureStore on app startup
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        
        if (token) {
          // Decode token client-side to extract role
          const decoded = decodeAccessToken(token);
          
          if (decoded) {
            // Check if token is expired
            if (decoded.isExpired) {
              if (__DEV__) {
                console.log('[Auth] Stored token is expired, logging out');
              }
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              dispatch(logout());
              return;
            }
            
            // Build user object from decoded token
            const user = {
              id: decoded.userId,
              email: decoded.email,
              role: decoded.role,
            };
            
            // Dispatch to Redux with token, user, and role
            dispatch(restoreSession({ token, user, role: decoded.role }));
          } else {
            // Token decode failed, clear and finish
            console.error('[Auth] Failed to decode stored token');
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            dispatch(finishRestoring());
          }
        } else {
          // No token found, finish restoring
          dispatch(finishRestoring());
        }
      } catch (error) {
        console.error('[Auth] Error reading token from SecureStore:', error);
        dispatch(finishRestoring());
      }
    };

    void bootstrapAuth();
  }, [dispatch]);

  // Show splash screen while restoring session
  if (isRestoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Once restored, show appropriate screen based on auth state and role
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={Login} />
      ) : role === 'admin' ? (
        <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      ) : (
        <Stack.Screen name="CustomerTabs" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
};

import React, { useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/useAuth';
import { useAppDispatch } from '../../app/hooks';
import { setCredentials, logout as logoutAction } from '../../features/auth/authSlice';
import { decodeAccessToken } from '../../utils/tokenUtils';

import { LogoBlock } from './components/LogoBlock';
import { HeroCard } from './components/HeroCard';
import { LoginActionCard } from './components/LoginActionCard';
import { FeatureCards } from './components/FeatureCards';

const Login = () => {
  const insets = useSafeAreaInsets();
  const { user, login, logout, accessToken, isLoading, error } = useAuth();
  const dispatch = useAppDispatch();

  // Automatically dispatch to Redux when both token and user are available
  useEffect(() => {
    if (accessToken && user) {
      const decoded = decodeAccessToken(accessToken);
      const role = decoded?.role ?? 'consumer';

      if (__DEV__) {
        console.log('[Auth] Login - decoded role:', role);
      }

      dispatch(setCredentials({ token: accessToken, user, role }));
    }
  }, [accessToken, user, dispatch]);

  const handleLogin = async () => {
    await login();
  };

  const handleCreateAccount = async () => {
    // Same Auth0 login flow - Auth0 handles both login and signup
    await login();
  };

  const handleAdminLogin = () => {
    // For now, same as regular login - Auth0 will determine role
    void login();
  };

  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={['#FCE8F0', '#FFFFFF']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1.8 }}
        className="flex-1"
        style={{ paddingTop: insets.top }}
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <LogoBlock />
          <HeroCard />
          <LoginActionCard
            onLogin={() => void handleLogin()}
            onCreateAccount={() => void handleCreateAccount()}
            onAdminLogin={handleAdminLogin}
            isLoading={isLoading}
            error={error}
          />
          <FeatureCards />
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

export default Login;

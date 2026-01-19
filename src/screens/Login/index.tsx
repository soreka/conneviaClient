import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/useAuth';
import { useAppDispatch } from '../../app/hooks';
import { setCredentials } from '../../features/auth/authSlice';
import { decodeAccessToken } from '../../utils/tokenUtils';

import { LogoBlock } from './components/LogoBlock';
import { HeroCard } from './components/HeroCard';
import { LoginActionCard } from './components/LoginActionCard';
import { FeatureCards } from './components/FeatureCards';

const Login = () => {
  const insets = useSafeAreaInsets();
  const { user, login, accessToken, isLoading, error } = useAuth();
  const dispatch = useAppDispatch();

  // Dispatch to Redux when both token and user are available
  useEffect(() => {
    if (accessToken && user) {
      const decoded = decodeAccessToken(accessToken);
      const role = decoded?.role ?? 'customer';
      dispatch(setCredentials({ token: accessToken, user, role }));
    }
  }, [accessToken, user, dispatch]);

  const handleLogin = async () => {
    await login();
  };

  const handleCreateAccount = async () => {
    await login();
  };

  const getErrorText = (e: unknown): string => {
  if (!e) return '';

  if (typeof e === 'string') return e;

  if (e instanceof Error) return e.message;

  if (typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    const msg = obj.message;
    const desc = obj.error_description;
    const err = obj.error;

    if (typeof msg === 'string') return msg;
    if (typeof desc === 'string') return desc;
    if (typeof err === 'string') return err;

    try {
      return JSON.stringify(obj);
    } catch {
      return 'خطأ غير معروف';
    }
  }

  return String(e);
};



  
  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={['#FCE8F0', '#FFFFFF']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        
        style={{ paddingTop: insets.top ,flex: 1}}
      >

        <ScrollView
          className="flex-1 "
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="flex-1 justify-center items-center p-4">
          <LogoBlock />
          <HeroCard />
          <LoginActionCard
            onLogin={() => void handleLogin()}
            onCreateAccount={() => void handleCreateAccount()}
            isLoading={isLoading}
            error={getErrorText(error)}
          />
          <FeatureCards />
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

export default Login;

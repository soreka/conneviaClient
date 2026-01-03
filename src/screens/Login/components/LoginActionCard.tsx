import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

interface LoginActionCardProps {
  onLogin: () => void;
  onCreateAccount: () => void;
  onAdminLogin: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const LoginActionCard: React.FC<LoginActionCardProps> = ({
  onLogin,
  onCreateAccount,
  onAdminLogin,
  isLoading = false,
  error,
}) => {
  return (
    <View className="mb-4">
      {/* Welcome text */}
      <View className="py-4">
        <Text className="text-2xl font-bold text-[#666666] text-center mb-2">
          مرحباً بك
        </Text>
        <Text className="text-sm text-[#8C8C8C] text-center leading-5">
          احجزي حصصك المفضلة، تابعي اشتراكك،{'\n'}وكوني جزءاً من مجتمعنا الرياضي
        </Text>
      </View>

      {/* Buttons */}
      <View>
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <Text className="text-red-600 text-sm text-right">{error}</Text>
          </View>
        ) : null}

        {/* Primary Login Button */}
        <Pressable
          className={`bg-[#A68CD4] rounded-xl h-12 items-center justify-center mb-3 ${isLoading ? 'opacity-50' : ''}`}
          onPress={onLogin}
          disabled={isLoading}
          style={({ pressed }) => pressed ? { backgroundColor: '#9577C9' } : {}}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white text-lg font-semibold">تسجيل الدخول</Text>
          )}
        </Pressable>

        {/* Secondary Create Account Button - Outlined */}
        <Pressable
          className="border-2 border-[#E8E3ED] rounded-xl h-12 items-center justify-center mb-3"
          onPress={onCreateAccount}
          disabled={isLoading}
          style={({ pressed }) => pressed ? { backgroundColor: '#F5F3F7' } : {}}
        >
          <Text className="text-[#666666] text-lg font-semibold">إنشاء حساب جديد</Text>
        </Pressable>

        {/* Admin Login Link */}
        <Pressable onPress={onAdminLogin} className="items-center py-2">
          <Text className="text-sm text-[#8C8C8C]">دخول الإدارة</Text>
        </Pressable>
      </View>
    </View>
  );
};

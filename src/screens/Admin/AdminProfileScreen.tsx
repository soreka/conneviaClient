// src/screens/Admin/AdminProfileScreen.tsx
// Admin Profile Screen - Profile info and logout functionality
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  LogOut,
} from 'lucide-react-native';
import { useAppDispatch } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import { resetToLogin } from '../../navigation/navigationRef';
import { Card, Button } from '../../components/UI';
import { useGetMeQuery } from '../../features/api/apiSlice';

const TOKEN_KEY = 'connevia.access_token';

export const AdminProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch admin profile data
  const { data: meData, isLoading, isError, refetch } = useGetMeQuery();
  const user = meData?.user;

  // Display name logic
  const displayName = user?.fullName ?? user?.email ?? 'مديرة';
  const userInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      'تأكيد تسجيل الخروج',
      'هل أنت متأكدة أنك تريدين تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // Clear token from SecureStore
              await SecureStore.deleteItemAsync(TOKEN_KEY);

              // Show success toast
              Toast.show({
                type: 'success',
                text1: 'تم تسجيل الخروج',
              });

              // Dispatch logout to clear Redux state
              dispatch(logout());

              // Navigate to Login
              resetToLogin();
            } catch (error) {
              console.error('[AdminLogout] Error:', error);
              Toast.show({
                type: 'error',
                text1: 'فشل تسجيل الخروج، حاولي مرة أخرى',
              });
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-100">
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top }}
        >
          <View className="px-4 py-6">
            <Text className="text-2xl font-bold text-white text-right">حساب المديرة</Text>
          </View>
        </LinearGradient>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text className="text-gray-500 mt-3">جاري التحميل...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 bg-gray-100">
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top }}
        >
          <View className="px-4 py-6">
            <Text className="text-2xl font-bold text-white text-right">حساب المديرة</Text>
          </View>
        </LinearGradient>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-center mb-4">فشل تحميل بيانات الحساب</Text>
          <Button onPress={() => refetch()}>
            <Text className="text-white">إعادة المحاولة</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header with gradient */}
      <LinearGradient
        colors={['#8b5cf6', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top }}
      >
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold text-white text-right">حساب المديرة</Text>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-violet-500 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-white">{userInitial}</Text>
          </View>
          <Text className="text-xl font-bold text-gray-800">{displayName}</Text>
        </View>

        {/* Account Info Card */}
        <Card className="mb-4">
          <Text className="text-lg font-bold text-gray-800 text-right mb-4">معلومات الحساب</Text>

          {/* Full Name */}
          <View className="flex-row-reverse items-center py-3 border-b border-gray-100">
            <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center ml-3">
              <UserIcon size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 text-right">الاسم الكامل</Text>
              <Text className="text-base text-gray-800 text-right">{user?.fullName || 'غير محدد'}</Text>
            </View>
          </View>

          {/* Email */}
          <View className="flex-row-reverse items-center py-3 border-b border-gray-100">
            <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center ml-3">
              <Mail size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 text-right">البريد الإلكتروني</Text>
              <Text className="text-base text-gray-800 text-right">{user?.email || 'غير محدد'}</Text>
            </View>
          </View>

          {/* Phone */}
          <View className="flex-row-reverse items-center py-3 border-b border-gray-100">
            <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center ml-3">
              <Phone size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 text-right">رقم الهاتف</Text>
              <Text className="text-base text-gray-800 text-right">{user?.phone || 'غير محدد'}</Text>
            </View>
          </View>

          {/* Role */}
          <View className="flex-row-reverse items-center py-3">
            <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center ml-3">
              <Shield size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 text-right">الدور</Text>
              <Text className="text-base text-gray-800 text-right">مديرة</Text>
            </View>
          </View>
        </Card>

        {/* Session Card */}
        <Card className="mb-4">
          <Text className="text-lg font-bold text-gray-800 text-right mb-4">الجلسة</Text>

          {/* Logout Button */}
          <Button
            variant="outline"
            onPress={handleLogout}
            disabled={isLoggingOut}
            leftIcon={<LogOut size={18} color="#DC2626" />}
            className="w-full border-red-500"
          >
            <Text className="text-red-600">
              {isLoggingOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
            </Text>
          </Button>
        </Card>
      </ScrollView>
    </View>
  );
};

export default AdminProfileScreen;

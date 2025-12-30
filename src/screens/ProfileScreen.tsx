// src/screens/ProfileScreen.tsx
import React from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { LogOut, Mail, User as UserIcon, CreditCard, Calendar } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout, selectCurrentUser } from '../features/auth/authSlice';
import { Screen, Card, Button, Badge } from '../components/UI';
import { useGetMySubscriptionQuery, useGetMySubscriptionUsageQuery } from '../features/api/apiSlice';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  active: 'نشط',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
  expired: 'منتهي',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  active: 'bg-green-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-500',
  expired: 'bg-gray-500',
};

export const ProfileScreen = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  
  const { data: subscriptionData, isLoading: subLoading } = useGetMySubscriptionQuery();
  const { data: usageData } = useGetMySubscriptionUsageQuery();

  const subscription = subscriptionData?.current;
  const usage = usageData?.usage;

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'نعم',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Screen scroll className="bg-background">
      <View className="p-4">
        {/* User Info Card */}
        <Card className="mb-4">
          <View className="p-4">
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-3">
                <UserIcon size={40} color="#A68CD4" />
              </View>
              <Text className="text-lg font-bold text-foreground">
                {user?.email || 'مستخدم'}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm text-muted-foreground capitalize">
                  {user?.role || 'consumer'}
                </Text>
              </View>
            </View>

            {user?.email && (
              <View className="flex-row-reverse items-center py-3 border-t border-border">
                <Mail size={18} color="#8C8C8C" />
                <Text className="text-base text-foreground mr-3 flex-1 text-right">
                  {user.email}
                </Text>
              </View>
            )}

            <View className="flex-row-reverse items-center py-3 border-t border-border">
              <UserIcon size={18} color="#8C8C8C" />
              <Text className="text-base text-foreground mr-3 flex-1 text-right">
                {user?.id || 'غير معروف'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Subscription Status Card */}
        <Card className="mb-4">
          <View className="p-4">
            <View className="flex-row-reverse items-center mb-3">
              <CreditCard size={20} color="#8b5cf6" />
              <Text className="text-lg font-bold text-foreground text-right mr-2">الاشتراك</Text>
            </View>

            {subLoading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : subscription ? (
              <>
                <View className="flex-row-reverse items-center justify-between mb-2">
                  <Text className="text-base text-foreground">{subscription.plan?.name || 'غير محدد'}</Text>
                  <Badge className={STATUS_COLORS[subscription.status] || 'bg-gray-500'}>
                    <Text className="text-white text-xs">{STATUS_LABELS[subscription.status] || subscription.status}</Text>
                  </Badge>
                </View>

                {subscription.status === 'active' && (
                  <View className="flex-row-reverse items-center mt-2">
                    <Calendar size={16} color="#8C8C8C" />
                    <Text className="text-sm text-muted-foreground mr-2">
                      ينتهي: {new Date(subscription.endDate).toLocaleDateString('ar-EG')}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text className="text-sm text-muted-foreground text-right">لا يوجد اشتراك نشط</Text>
            )}
          </View>
        </Card>

        {/* Usage Card */}
        {usage && (
          <Card className="mb-4">
            <View className="p-4">
              <Text className="text-lg font-bold text-foreground text-right mb-3">استخدام الجلسات</Text>
              
              {/* Monthly usage */}
              <View className="flex-row-reverse justify-between items-center mb-2">
                <Text className="text-sm text-muted-foreground">الجلسات الشهرية:</Text>
                <Text className="text-lg font-bold text-foreground">
                  {usage.monthlyUsed} / {usage.monthlyLimit}
                </Text>
              </View>

              <View className="flex-row-reverse justify-between items-center mb-4">
                <Text className="text-sm text-muted-foreground">المتبقي شهرياً:</Text>
                <Text className={`text-lg font-bold ${usage.monthlyLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {usage.monthlyLeft} جلسات
                </Text>
              </View>

              {/* Weekly usage */}
              <View className="flex-row-reverse justify-between items-center mb-2">
                <Text className="text-sm text-muted-foreground">هذا الأسبوع:</Text>
                <Text className="text-lg font-bold text-foreground">
                  {usage.weeklyUsed} / {usage.weeklyLimit}
                </Text>
              </View>

              <View className="flex-row-reverse justify-between items-center">
                <Text className="text-sm text-muted-foreground">المتبقي أسبوعياً:</Text>
                <Text className={`text-lg font-bold ${usage.weeklyLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {usage.weeklyLeft} جلسات
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Logout Button */}
        <Card className="mb-4">
          <View className="p-4">
            <Button
              variant="destructive"
              onPress={handleLogout}
              leftIcon={<LogOut size={18} color="#FFFFFF" />}
              className="w-full"
            >
              تسجيل الخروج
            </Button>
          </View>
        </Card>

        {/* Dev Info */}
        <Text className="text-xs text-muted-foreground text-center mt-4">
          للتبديل بين الأدوار، قم بتسجيل الخروج ثم تسجيل الدخول بحساب آخر
        </Text>
      </View>
    </Screen>
  );
};

export default ProfileScreen;

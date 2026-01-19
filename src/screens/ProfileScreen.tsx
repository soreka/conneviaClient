// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, Pressable, Linking, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  LogOut,
  Mail,
  User as UserIcon,
  CreditCard,
  Calendar,
  ArrowRight,
  Camera,
  Edit,
  Phone,
  MessageCircle,
  Bell,
  Globe,
  Lock,
  Heart,
  Check,
  X,
} from 'lucide-react-native';
import { useAppDispatch } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { resetToLogin } from '../navigation/navigationRef';
import { Card, Button, Badge, Switch } from '../components/UI';
import {
  useGetMeQuery,
  usePatchMeMutation,
  usePatchMyHealthMutation,
  useGetMySubscriptionQuery,
  useGetMySubscriptionUsageQuery,
} from '../features/api/apiSlice';

// Studio contact info
const STUDIO_PHONE = '+972501234567';
const STUDIO_WHATSAPP = '972501234567';

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
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // Use useGetMeQuery as the source of truth for profile data
  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const user = meData?.user;

  const { data: subscriptionData, isLoading: subLoading } = useGetMySubscriptionQuery();
  const { data: usageData } = useGetMySubscriptionUsageQuery();

  // Mutations
  const [patchMe, { isLoading: isSavingPersonal }] = usePatchMeMutation();
  const [patchMyHealth, { isLoading: isSavingHealth }] = usePatchMyHealthMutation();

  const subscription = subscriptionData?.current;
  const usage = usageData?.usage;

  // Local state for notifications toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit mode states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingHealth, setIsEditingHealth] = useState(false);

  // Personal data form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Health data form state
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [healthStatus, setHealthStatus] = useState('');

  // Initialize form values when user data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setAge(user.health?.age?.toString() || '');
      setWeight(user.health?.weight?.toString() || '');
      setHealthStatus(user.health?.healthStatus || '');
    }
  }, [user]);

  // Display name logic
  const displayName = user?.fullName ?? user?.email ?? 'مستخدمة';
  const userInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم',
          style: 'destructive',
          onPress: () => {
            if (__DEV__) console.log('[Logout] ProfileScreen - BEFORE dispatch(logout)');
            dispatch(logout());
            if (__DEV__) console.log('[Logout] ProfileScreen - AFTER dispatch(logout), calling resetToLogin');
            resetToLogin();
            if (__DEV__) console.log('[Logout] ProfileScreen - AFTER resetToLogin');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSavePersonal = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Toast.show({
        type: 'error',
        text1: 'يرجى تعبئة جميع الحقول المطلوبة',
        position: 'bottom',
      });
      return;
    }

    try {
      await patchMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      }).unwrap();

      Toast.show({
        type: 'success',
        text1: 'تم حفظ البيانات الشخصية',
        position: 'bottom',
      });
      setIsEditingPersonal(false);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'حدث خطأ أثناء حفظ البيانات',
        position: 'bottom',
      });
    }
  };

  const handleSaveHealth = async () => {
    const ageNum = Number(age);
    const weightNum = Number(weight);

    if (!ageNum || ageNum < 1 || ageNum > 120) {
      Toast.show({
        type: 'error',
        text1: 'يرجى إدخال عمر صحيح',
        position: 'bottom',
      });
      return;
    }

    if (!weightNum || weightNum < 20 || weightNum > 300) {
      Toast.show({
        type: 'error',
        text1: 'يرجى إدخال وزن صحيح',
        position: 'bottom',
      });
      return;
    }

    try {
      await patchMyHealth({
        age: ageNum,
        weight: weightNum,
        healthStatus: healthStatus.trim() || undefined,
      }).unwrap();

      Toast.show({
        type: 'success',
        text1: 'تم حفظ المعلومات الصحية',
        position: 'bottom',
      });
      setIsEditingHealth(false);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'حدث خطأ أثناء حفظ البيانات',
        position: 'bottom',
      });
    }
  };

  const handleCancelPersonal = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhone(user?.phone || '');
    setIsEditingPersonal(false);
  };

  const handleCancelHealth = () => {
    setAge(user?.health?.age?.toString() || '');
    setWeight(user?.health?.weight?.toString() || '');
    setHealthStatus(user?.health?.healthStatus || '');
    setIsEditingHealth(false);
  };

  const handleChangePassword = () => {
    Toast.show({
      type: 'info',
      text1: 'تغيير كلمة المرور',
      text2: 'هذه الميزة قادمة قريباً',
      position: 'bottom',
    });
  };

  const handleCallStudio = () => {
    Linking.openURL(`tel:${STUDIO_PHONE}`);
  };

  const handleWhatsAppStudio = () => {
    Linking.openURL(`https://wa.me/${STUDIO_WHATSAPP}`);
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Gradient Header */}
      <LinearGradient
        colors={['#A68CD4', 'rgba(166,140,212,0.8)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 24,
          paddingBottom: 32,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View className="px-4">
          {/* Header Bar */}
          <View className="flex-row-reverse items-center justify-between mb-6 p-2">
            <Pressable
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              onPress={() => {}}
            >
              <ArrowRight size={20} color="#FFFFFF" />
            </Pressable>
            <Text className="text-2xl font-bold text-white">الملف الشخصي</Text>
            <View className="w-10" />
          </View>

          {/* Profile Card inside header */}
          <View className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <View className="flex-row-reverse items-center">
              {/* Avatar */}
              <View className="relative">
                <View className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 items-center justify-center">
                  {user?.fullName ? (
                    <Text className="text-3xl font-bold text-white">{userInitial}</Text>
                  ) : (
                    <UserIcon size={40} color="#FFFFFF" />
                  )}
                </View>
                {/* Camera overlay button */}
                <Pressable className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm">
                  <Camera size={16} color="#A68CD4" />
                </Pressable>
              </View>

              {/* Name & Phone */}
              <View className="flex-1 mr-4">
                <Text className="text-xl font-bold text-white text-right">{displayName}</Text>
                {user?.phone ? (
                  <Text className="text-sm text-white/80 text-right mt-1">{user.phone}</Text>
                ) : (
                  <Text className="text-sm text-white/60 text-right mt-1">—</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Cards Container */}
      <ScrollView
        className="flex-1 px-2 -mt-2"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-4 pt-4 p-2 ">
          {/* Subscription Card */}
          <Card className="bg-white border border-[#E8E3ED] rounded-2xl shadow-sm mt-2">
            <View className="p-4">
              <View className="flex-row-reverse items-center mb-3">
                <CreditCard size={20} color="#A68CD4" />
                <Text className="text-lg font-bold text-[#666666] text-right mr-2">الاشتراك</Text>
              </View>

              {subLoading ? (
                <ActivityIndicator size="small" color="#A68CD4" />
              ) : subscription ? (
                <>
                  <View className="flex-row-reverse items-center justify-between mb-2">
                    <Text className="text-base text-[#666666]">{subscription.plan?.name || 'غير محدد'}</Text>
                    <Badge className={STATUS_COLORS[subscription.status] || 'bg-gray-500'}>
                      <Text className="text-white text-xs">{STATUS_LABELS[subscription.status] || subscription.status}</Text>
                    </Badge>
                  </View>

                  {subscription.status === 'active' && (
                    <View className="flex-row-reverse items-center mt-2">
                      <Calendar size={16} color="#8C8C8C" />
                      <Text className="text-sm text-[#8C8C8C] mr-2">
                        ينتهي: {new Date(subscription.endDate).toLocaleDateString('ar-EG')}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text className="text-sm text-[#8C8C8C] text-right">لا يوجد اشتراك نشط</Text>
              )}
            </View>
          </Card>

          {/* Usage Card */}
          {usage && (
            <Card className="bg-white border border-[#E8E3ED] rounded-2xl shadow-sm mt-4">
              <View className="p-4">
                <View className="flex-row-reverse items-center mb-3">
                  <Calendar size={20} color="#A68CD4" />
                  <Text className="text-lg font-bold text-[#666666] text-right mr-2">استخدام الجلسات</Text>
                </View>

                {/* Monthly usage */}
                <View className="flex-row-reverse justify-between items-center mb-2">
                  <Text className="text-sm text-[#8C8C8C]">الجلسات الشهرية:</Text>
                  <Text className="text-lg font-bold text-[#666666]">
                    {usage.monthlyUsed} / {usage.monthlyLimit}
                  </Text>
                </View>

                <View className="flex-row-reverse justify-between items-center mb-4">
                  <Text className="text-sm text-[#8C8C8C]">المتبقي شهرياً:</Text>
                  <Text className={`text-lg font-bold ${usage.monthlyLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {usage.monthlyLeft} جلسات
                  </Text>
                </View>

                {/* Weekly usage */}
                <View className="flex-row-reverse justify-between items-center mb-2">
                  <Text className="text-sm text-[#8C8C8C]">هذا الأسبوع:</Text>
                  <Text className="text-lg font-bold text-[#666666]">
                    {usage.weeklyUsed} / {usage.weeklyLimit}
                  </Text>
                </View>

                <View className="flex-row-reverse justify-between items-center">
                  <Text className="text-sm text-[#8C8C8C]">المتبقي أسبوعياً:</Text>
                  <Text className={`text-lg font-bold ${usage.weeklyLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {usage.weeklyLeft} جلسات
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Personal Data Card */}
          <Card className="bg-white border border-[#E8E3ED] rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <View className="flex-row-reverse items-center justify-between mb-4">
                <View className="flex-row-reverse items-center">
                  <UserIcon size={20} color="#A68CD4" />
                  <Text className="text-lg font-bold text-[#666666] text-right mr-2">البيانات الشخصية</Text>
                </View>
                {!isEditingPersonal ? (
                  <Pressable className="p-2" onPress={() => setIsEditingPersonal(true)}>
                    <Edit size={18} color="#8C8C8C" />
                  </Pressable>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      className="p-2"
                      onPress={handleCancelPersonal}
                      disabled={isSavingPersonal}
                    >
                      <X size={18} color="#EF4444" />
                    </Pressable>
                    <Pressable
                      className="p-2"
                      onPress={() => void handleSavePersonal()}
                      disabled={isSavingPersonal}
                    >
                      {isSavingPersonal ? (
                        <ActivityIndicator size="small" color="#A68CD4" />
                      ) : (
                        <Check size={18} color="#22C55E" />
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              {isEditingPersonal ? (
                <>
                  {/* First Name - Editable */}
                  <View className="mb-3">
                    <Text className="text-xs text-[#8C8C8C] text-right mb-1">الاسم الأول</Text>
                    <TextInput
                      className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-right text-[#666666]"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="أدخلي الاسم الأول"
                      placeholderTextColor="#BDBDBD"
                    />
                  </View>

                  {/* Last Name - Editable */}
                  <View className="mb-3">
                    <Text className="text-xs text-[#8C8C8C] text-right mb-1">اسم العائلة</Text>
                    <TextInput
                      className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-right text-[#666666]"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="أدخلي اسم العائلة"
                      placeholderTextColor="#BDBDBD"
                    />
                  </View>

                  {/* Phone - Editable */}
                  <View className="mb-3">
                    <Text className="text-xs text-[#8C8C8C] text-right mb-1">رقم الهاتف</Text>
                    <TextInput
                      className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-right text-[#666666]"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="05xxxxxxxx"
                      placeholderTextColor="#BDBDBD"
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Email - Read Only in Edit Mode */}
                  <View className="mb-1">
                    <Text className="text-xs text-[#8C8C8C] text-right mb-1">البريد الإلكتروني</Text>
                    <View className="bg-[#EEEEEE] rounded-lg px-3 py-2">
                      <Text className="text-right text-[#999999]">{user?.email || '—'}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-[#A68CD4] text-right mb-2">
                    تغيير البريد الإلكتروني يتم من خلال تسجيل الدخول (Auth0)
                  </Text>
                </>
              ) : (
                <>
                  {/* First Name - View Mode */}
                  <View className="flex-row-reverse items-center py-3 border-b border-[#E8E3ED]">
                    <UserIcon size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-[#8C8C8C] text-right">الاسم الأول</Text>
                      <Text className="text-sm text-[#666666] text-right">{user?.firstName || '—'}</Text>
                    </View>
                  </View>

                  {/* Last Name - View Mode */}
                  <View className="flex-row-reverse items-center py-3 border-b border-[#E8E3ED]">
                    <UserIcon size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-[#8C8C8C] text-right">اسم العائلة</Text>
                      <Text className="text-sm text-[#666666] text-right">{user?.lastName || '—'}</Text>
                    </View>
                  </View>

                  {/* Phone - View Mode */}
                  <View className="flex-row-reverse items-center py-3 border-b border-[#E8E3ED]">
                    <Phone size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-[#8C8C8C] text-right">رقم الهاتف</Text>
                      <Text className="text-sm text-[#666666] text-right">{user?.phone || '—'}</Text>
                    </View>
                  </View>

                  {/* Email - Read Only */}
                  <View className="flex-row-reverse items-center py-3">
                    <Mail size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-[#8C8C8C] text-right">البريد الإلكتروني</Text>
                      <Text className="text-sm text-[#666666] text-right">{user?.email || '—'}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-[#A68CD4] text-right">
                    تغيير البريد الإلكتروني يتم من خلال تسجيل الدخول (Auth0)
                  </Text>
                </>
              )}
            </View>
          </Card>

          {/* Health Info Card */}
          <Card className="bg-white border border-[#E8E3ED] rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <View className="flex-row-reverse items-center justify-between mb-4">
                <View className="flex-row-reverse items-center">
                  <Heart size={20} color="#A68CD4" />
                  <Text className="text-lg font-bold text-[#666666] text-right mr-2">المعلومات الصحية</Text>
                </View>
                {!isEditingHealth ? (
                  <Pressable className="p-2" onPress={() => setIsEditingHealth(true)}>
                    <Edit size={18} color="#8C8C8C" />
                  </Pressable>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      className="p-2"
                      onPress={handleCancelHealth}
                      disabled={isSavingHealth}
                    >
                      <X size={18} color="#EF4444" />
                    </Pressable>
                    <Pressable
                      className="p-2"
                      onPress={() => void handleSaveHealth()}
                      disabled={isSavingHealth}
                    >
                      {isSavingHealth ? (
                        <ActivityIndicator size="small" color="#A68CD4" />
                      ) : (
                        <Check size={18} color="#22C55E" />
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              {isEditingHealth ? (
                <>
                  {/* Age - Editable */}
                  <View className="mb-3">
                    <Text className="text-xs text-[#8C8C8C] text-right mb-1">العمر</Text>
                    <TextInput
                      className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-right text-[#666666]"
                      value={age}
                      onChangeText={setAge}
                      placeholder="أدخلي العمر"
                      placeholderTextColor="#BDBDBD"
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Weight - Editable */}
                  <View className="mb-3">
                    <Text className="text-xs text-[#8C8C8C] text-right mb-1">الوزن (كجم)</Text>
                    <TextInput
                      className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-right text-[#666666]"
                      value={weight}
                      onChangeText={setWeight}
                      placeholder="أدخلي الوزن"
                      placeholderTextColor="#BDBDBD"
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Health Status - Editable */}
                  <View className="mb-3">
                    <Text className="text-xs text-[#8C8C8C] text-right mb-1">الحالة الصحية</Text>
                    <TextInput
                      className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-right text-[#666666]"
                      value={healthStatus}
                      onChangeText={setHealthStatus}
                      placeholder="أي ملاحظات صحية (اختياري)"
                      placeholderTextColor="#BDBDBD"
                      multiline
                      numberOfLines={3}
                      style={{ textAlignVertical: 'top', minHeight: 80 }}
                    />
                  </View>
                </>
              ) : (
                <>
                  {/* Age - View Mode */}
                  <View className="flex-row-reverse items-center py-3 border-b border-[#E8E3ED]">
                    <Calendar size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-[#8C8C8C] text-right">العمر</Text>
                      <Text className="text-sm text-[#666666] text-right">
                        {user?.health?.age ? `${user.health.age} سنة` : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Weight - View Mode */}
                  <View className="flex-row-reverse items-center py-3 border-b border-[#E8E3ED]">
                    <Heart size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-[#8C8C8C] text-right">الوزن</Text>
                      <Text className="text-sm text-[#666666] text-right">
                        {user?.health?.weight ? `${user.health.weight} كجم` : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Health Status - View Mode */}
                  <View className="flex-row-reverse items-center py-3">
                    <Heart size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-[#8C8C8C] text-right">الحالة الصحية</Text>
                      <Text className="text-sm text-[#666666] text-right">
                        {user?.health?.healthStatus || '—'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </Card>

          {/* Account Settings Card */}
          <Card className="bg-white border border-[#E8E3ED] rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <Text className="text-lg font-bold text-[#666666] text-right mb-4">إعدادات الحساب</Text>

              {/* Notifications */}
              <View className="flex-row-reverse items-center justify-between py-3 border-b border-[#E8E3ED]">
                <View className="flex-row-reverse items-center">
                  <Bell size={18} color="#8C8C8C" />
                  <Text className="text-sm text-[#666666] mr-3">الإشعارات</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              </View>

              {/* Language */}
              <View className="flex-row-reverse items-center justify-between py-3 border-b border-[#E8E3ED]">
                <View className="flex-row-reverse items-center">
                  <Globe size={18} color="#8C8C8C" />
                  <Text className="text-sm text-[#666666] mr-3">اللغة</Text>
                </View>
                <Text className="text-sm text-[#8C8C8C]">العربية</Text>
              </View>

              {/* Change Password */}
              <Pressable
                onPress={handleChangePassword}
                className="flex-row-reverse items-center justify-between py-3"
              >
                <View className="flex-row-reverse items-center">
                  <Lock size={18} color="#8C8C8C" />
                  <Text className="text-sm text-[#666666] mr-3">تغيير كلمة المرور</Text>
                </View>
                <ArrowRight size={18} color="#8C8C8C" style={{ transform: [{ scaleX: -1 }] }} />
              </Pressable>
            </View>
          </Card>

          {/* Contact Studio Card */}
          <Card className="bg-white border border-[#E8E3ED] rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <Text className="text-lg font-bold text-[#666666] text-right mb-2">تواصلي معنا</Text>
              <Text className="text-sm text-[#8C8C8C] text-right mb-4">
                لأي استفسار أو مساعدة، تواصلي مع الاستوديو
              </Text>

              <View className="flex-row-reverse gap-3">
                <Pressable
                  onPress={handleCallStudio}
                  className="flex-1 bg-[#A68CD4] rounded-xl py-3 flex-row-reverse items-center justify-center"
                >
                  <Phone size={18} color="#FFFFFF" />
                  <Text className="text-white font-medium mr-2">اتصال</Text>
                </Pressable>

                <Pressable
                  onPress={handleWhatsAppStudio}
                  className="flex-1 bg-[#25D366] rounded-xl py-3 flex-row-reverse items-center justify-center"
                >
                  <MessageCircle size={18} color="#FFFFFF" />
                  <Text className="text-white font-medium mr-2">واتساب</Text>
                </Pressable>
              </View>
            </View>
          </Card>

          {/* Logout Button */}
          <View className="mt-4">
          <Button
            variant="destructive"
            onPress={handleLogout}
            leftIcon={<LogOut size={18} color="#FFFFFF" />}
            className="w-full"
          >
            تسجيل الخروج
          </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;

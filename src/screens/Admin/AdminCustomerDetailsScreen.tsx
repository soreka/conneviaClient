// src/screens/Admin/AdminCustomerDetailsScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  AppState,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useIsFocused, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {
  ArrowRight,
  User as UserIcon,
  Heart,
  CreditCard,
  Calendar,
  FileText,
  Edit,
  Check,
  X,
  ChevronDown,
} from 'lucide-react-native';
import { Card, Button, Badge } from '../../components/UI';
import {
  useAdminGetCustomerDetailsQuery,
  useAdminPatchCustomerPersonalMutation,
  useAdminPatchCustomerHealthMutation,
  useAdminPatchCustomerNotesMutation,
  useAdminPatchCustomerSubscriptionMutation,
} from '../../features/api/apiSlice';

// Define param list inline to avoid circular imports
type AdminCustomersStackParamList = {
  AdminCustomersList: undefined;
  AdminCustomerDetails: { customerId: string };
};

type Nav = NativeStackNavigationProp<AdminCustomersStackParamList, 'AdminCustomerDetails'>;
type RouteParams = RouteProp<AdminCustomersStackParamList, 'AdminCustomerDetails'>;

// Status labels and colors
const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  pending: 'قيد الانتظار',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
  expired: 'منتهي',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-500',
  expired: 'bg-gray-500',
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  booked: 'محجوز',
  canceled: 'ملغي',
  attended: 'حضر',
};

const REFETCH_DEBOUNCE_MS = 1000;

export const AdminCustomerDetailsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { customerId } = route.params;
  const isFocused = useIsFocused();
  const lastRefetchAt = useRef<number>(0);

  const [refreshing, setRefreshing] = useState(false);

  // Edit mode states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Personal form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Health form state
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [healthStatus, setHealthStatus] = useState('');

  // Notes form state
  const [adminNotes, setAdminNotes] = useState('');

  // Subscription form state
  const [subStatus, setSubStatus] = useState('');
  const [subEndDate, setSubEndDate] = useState('');

  // Query
  const { data, isLoading, isFetching, refetch } = useAdminGetCustomerDetailsQuery(customerId);

  // Mutations
  const [patchPersonal, { isLoading: isSavingPersonal }] = useAdminPatchCustomerPersonalMutation();
  const [patchHealth, { isLoading: isSavingHealth }] = useAdminPatchCustomerHealthMutation();
  const [patchNotes, { isLoading: isSavingNotes }] = useAdminPatchCustomerNotesMutation();
  const [patchSubscription, { isLoading: isSavingSubscription }] =
    useAdminPatchCustomerSubscriptionMutation();

  // Initialize / resync form state from server data.
  //
  // C-NET-04: while the admin is mid-edit, a background refetch (focus or
  // AppState 'active') would otherwise overwrite typed-but-unsaved changes.
  // Guard the resync with the per-card isEditing flags so the server->local
  // sync is skipped whenever ANY edit is in progress. The flags are in the
  // dep array so the effect re-evaluates when edit mode toggles off (the
  // existing handleCancel* paths reset the fields explicitly from `data`,
  // so this effect doesn't need to re-fire on exit — but including the
  // flags keeps React's exhaustive-deps invariant intact).
  useEffect(() => {
    if (isEditingPersonal || isEditingHealth || isEditingNotes || isEditingSubscription) return;
    if (data) {
      setFirstName(data.personal.firstName || '');
      setLastName(data.personal.lastName || '');
      setPhone(data.personal.phone || '');
      setAge(data.health.age?.toString() || '');
      setWeight(data.health.weight?.toString() || '');
      setHealthStatus(data.health.healthStatus || '');
      setAdminNotes(data.notes.adminNotes || '');
      if (data.subscription) {
        setSubStatus(data.subscription.status);
        setSubEndDate(data.subscription.endDate.split('T')[0]); // YYYY-MM-DD
      }
    }
  }, [data, isEditingPersonal, isEditingHealth, isEditingNotes, isEditingSubscription]);

  // Guarded refetch
  const asyncGuardedRefetch = useCallback(async () => {
    if (!isFocused) return;
    if (isFetching) return;

    const now = Date.now();
    if (now - lastRefetchAt.current < REFETCH_DEBOUNCE_MS) return;

    lastRefetchAt.current = now;
    return refetch();
  }, [refetch, isFetching, isFocused]);

  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
    }, [asyncGuardedRefetch])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void asyncGuardedRefetch();
    });
    return () => sub.remove();
  }, [asyncGuardedRefetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await asyncGuardedRefetch();
    } finally {
      setRefreshing(false);
    }
  }, [asyncGuardedRefetch]);

  // Save handlers
  const handleSavePersonal = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Toast.show({ type: 'error', text1: 'يرجى تعبئة الاسم الأول واسم العائلة', position: 'bottom' });
      return;
    }

    try {
      await patchPersonal({
        customerId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      }).unwrap();

      Toast.show({ type: 'success', text1: 'تم حفظ البيانات الشخصية', position: 'bottom' });
      setIsEditingPersonal(false);
    } catch {
      Toast.show({ type: 'error', text1: 'حدث خطأ أثناء حفظ البيانات', position: 'bottom' });
    }
  };

  const handleSaveHealth = async () => {
    const ageNum = Number(age);
    const weightNum = Number(weight);

    if (age && (ageNum < 1 || ageNum > 120)) {
      Toast.show({ type: 'error', text1: 'يرجى إدخال عمر صحيح', position: 'bottom' });
      return;
    }

    if (weight && (weightNum < 20 || weightNum > 300)) {
      Toast.show({ type: 'error', text1: 'يرجى إدخال وزن صحيح', position: 'bottom' });
      return;
    }

    try {
      await patchHealth({
        customerId,
        age: ageNum || undefined,
        weight: weightNum || undefined,
        healthStatus: healthStatus.trim() || undefined,
      }).unwrap();

      Toast.show({ type: 'success', text1: 'تم حفظ المعلومات الصحية', position: 'bottom' });
      setIsEditingHealth(false);
    } catch {
      Toast.show({ type: 'error', text1: 'حدث خطأ أثناء حفظ البيانات', position: 'bottom' });
    }
  };

  const handleSaveNotes = async () => {
    try {
      await patchNotes({
        customerId,
        adminNotes: adminNotes.trim() || undefined,
      }).unwrap();

      Toast.show({ type: 'success', text1: 'تم حفظ الملاحظات', position: 'bottom' });
      setIsEditingNotes(false);
    } catch {
      Toast.show({ type: 'error', text1: 'حدث خطأ أثناء حفظ الملاحظات', position: 'bottom' });
    }
  };

  const handleSaveSubscription = async () => {
    try {
      await patchSubscription({
        customerId,
        status: subStatus || undefined,
        endDate: subEndDate ? new Date(subEndDate).toISOString() : undefined,
      }).unwrap();

      Toast.show({ type: 'success', text1: 'تم حفظ بيانات الاشتراك', position: 'bottom' });
      setIsEditingSubscription(false);
    } catch {
      Toast.show({ type: 'error', text1: 'حدث خطأ أثناء حفظ الاشتراك', position: 'bottom' });
    }
  };

  // Cancel handlers
  const handleCancelPersonal = () => {
    if (data) {
      setFirstName(data.personal.firstName || '');
      setLastName(data.personal.lastName || '');
      setPhone(data.personal.phone || '');
    }
    setIsEditingPersonal(false);
  };

  const handleCancelHealth = () => {
    if (data) {
      setAge(data.health.age?.toString() || '');
      setWeight(data.health.weight?.toString() || '');
      setHealthStatus(data.health.healthStatus || '');
    }
    setIsEditingHealth(false);
  };

  const handleCancelNotes = () => {
    if (data) {
      setAdminNotes(data.notes.adminNotes || '');
    }
    setIsEditingNotes(false);
  };

  const handleCancelSubscription = () => {
    if (data?.subscription) {
      setSubStatus(data.subscription.status);
      setSubEndDate(data.subscription.endDate.split('T')[0]);
    }
    setIsEditingSubscription(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 24-hour clock with Western digits — matches the rest of the app.
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const customerName = data
    ? `${data.personal.firstName || ''} ${data.personal.lastName || ''}`.trim() ||
      data.personal.email
    : '';

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#A68CD4" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-4">
        <Text className="text-lg text-foreground text-center">الزبونة غير موجودة</Text>
        <Button variant="outline" className="mt-4" onPress={() => navigation.goBack()}>
          العودة
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <LinearGradient
        colors={['#A68CD4', 'rgba(166,140,212,0.8)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View className="px-4">
          <View className="flex-row-reverse items-center justify-between mb-2">
            <View className="flex-row-reverse items-center">
              <Pressable
                className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-2"
                onPress={() => navigation.goBack()}
              >
                <ArrowRight size={20} color="#FFFFFF" />
              </Pressable>
              <Text className="text-2xl font-bold text-white">تفاصيل الزبونة</Text>
            </View>
          </View>

          {/* Profile strip */}
          <View className="flex-row-reverse items-center mt-2">
            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
              <Text className="text-xl font-bold text-white">
                {customerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 mr-3">
              <Text className="text-lg font-bold text-white text-right">{customerName}</Text>
              {data.subscription && (
                <View className="flex-row-reverse items-center mt-1">
                  <Badge className={STATUS_COLORS[data.subscription.status] || 'bg-gray-500'}>
                    <Text className="text-white text-xs">
                      {STATUS_LABELS[data.subscription.status] || data.subscription.status}
                    </Text>
                  </Badge>
                  {data.subscription.planName && (
                    <Text className="text-white/80 text-sm mr-2">
                      {data.subscription.planName}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      {/* C-UX-07: 9 editable TextInputs (incl. multi-line health notes) live
          inside this ScrollView. Wrap it in a KeyboardAvoidingView so the
          keyboard pushes the form up instead of hiding the focused input and
          the per-card save button on smaller phones. `keyboardShouldPersistTaps`
          keeps the save tap from being swallowed by a dismiss while typing. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
      <ScrollView
        className="flex-1 px-2"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="space-y-4 pt-4 p-2">
          {/* Personal Data Card */}
          <Card className="bg-white border border-border rounded-2xl shadow-sm mt-2">
            <View className="p-4">
              <View className="flex-row-reverse items-center justify-between mb-4">
                <View className="flex-row-reverse items-center">
                  <UserIcon size={20} color="#A68CD4" />
                  <Text className="text-lg font-bold text-foreground text-right mr-2">
                    البيانات الشخصية
                  </Text>
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
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">الاسم الأول</Text>
                    <TextInput
                      className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="أدخلي الاسم الأول"
                      placeholderTextColor="#BDBDBD"
                    />
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">اسم العائلة</Text>
                    <TextInput
                      className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="أدخلي اسم العائلة"
                      placeholderTextColor="#BDBDBD"
                    />
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">رقم الهاتف</Text>
                    <TextInput
                      className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="05xxxxxxxx"
                      placeholderTextColor="#BDBDBD"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View className="mb-1">
                    <Text className="text-xs text-muted-foreground text-right mb-1">البريد الإلكتروني</Text>
                    <View className="bg-gray-200 rounded-lg px-3 py-2">
                      <Text className="text-right text-gray-500">{data.personal.email}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-primary text-right">
                    البريد الإلكتروني للقراءة فقط (Auth0)
                  </Text>
                </>
              ) : (
                <>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <UserIcon size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">الاسم الأول</Text>
                      <Text className="text-sm text-foreground text-right">
                        {data.personal.firstName || '—'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <UserIcon size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">اسم العائلة</Text>
                      <Text className="text-sm text-foreground text-right">
                        {data.personal.lastName || '—'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <UserIcon size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">رقم الهاتف</Text>
                      <Text className="text-sm text-foreground text-right">
                        {data.personal.phone || '—'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3">
                    <UserIcon size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">البريد الإلكتروني</Text>
                      <Text className="text-sm text-foreground text-right">{data.personal.email}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-primary text-right">
                    البريد الإلكتروني للقراءة فقط (Auth0)
                  </Text>
                </>
              )}
            </View>
          </Card>

          {/* Health Data Card */}
          <Card className="bg-white border border-border rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <View className="flex-row-reverse items-center justify-between mb-4">
                <View className="flex-row-reverse items-center">
                  <Heart size={20} color="#A68CD4" />
                  <Text className="text-lg font-bold text-foreground text-right mr-2">
                    المعلومات الصحية
                  </Text>
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
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">العمر</Text>
                    <TextInput
                      className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                      value={age}
                      onChangeText={setAge}
                      placeholder="أدخلي العمر"
                      placeholderTextColor="#BDBDBD"
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">الوزن (كجم)</Text>
                    <TextInput
                      className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                      value={weight}
                      onChangeText={setWeight}
                      placeholder="أدخلي الوزن"
                      placeholderTextColor="#BDBDBD"
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">الحالة الصحية</Text>
                    <TextInput
                      className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                      value={healthStatus}
                      onChangeText={setHealthStatus}
                      placeholder="أي ملاحظات صحية"
                      placeholderTextColor="#BDBDBD"
                      multiline
                      numberOfLines={3}
                      style={{ textAlignVertical: 'top', minHeight: 80 }}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <Calendar size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">العمر</Text>
                      <Text className="text-sm text-foreground text-right">
                        {data.health.age ? `${data.health.age} سنة` : '—'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <Heart size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">الوزن</Text>
                      <Text className="text-sm text-foreground text-right">
                        {data.health.weight ? `${data.health.weight} كجم` : '—'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3">
                    <Heart size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">الحالة الصحية</Text>
                      <Text className="text-sm text-foreground text-right">
                        {data.health.healthStatus || '—'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </Card>

          {/* Subscription Card */}
          <Card className="bg-white border border-border rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <View className="flex-row-reverse items-center justify-between mb-4">
                <View className="flex-row-reverse items-center">
                  <CreditCard size={20} color="#A68CD4" />
                  <Text className="text-lg font-bold text-foreground text-right mr-2">
                    الاشتراك
                  </Text>
                </View>
                {data.subscription && !isEditingSubscription && (
                  <Pressable className="p-2" onPress={() => setIsEditingSubscription(true)}>
                    <Edit size={18} color="#8C8C8C" />
                  </Pressable>
                )}
                {isEditingSubscription && (
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      className="p-2"
                      onPress={handleCancelSubscription}
                      disabled={isSavingSubscription}
                    >
                      <X size={18} color="#EF4444" />
                    </Pressable>
                    <Pressable
                      className="p-2"
                      onPress={() => void handleSaveSubscription()}
                      disabled={isSavingSubscription}
                    >
                      {isSavingSubscription ? (
                        <ActivityIndicator size="small" color="#A68CD4" />
                      ) : (
                        <Check size={18} color="#22C55E" />
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              {!data.subscription ? (
                <Text className="text-sm text-muted-foreground text-right">
                  لا يوجد اشتراك نشط
                </Text>
              ) : isEditingSubscription ? (
                <>
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">الحالة</Text>
                    <Pressable
                      className="flex-row-reverse items-center justify-between bg-muted rounded-lg px-3 py-3"
                      onPress={() => setShowStatusModal(true)}
                    >
                      <Text className="text-foreground">
                        {STATUS_LABELS[subStatus] || subStatus}
                      </Text>
                      <ChevronDown size={18} color="#8C8C8C" />
                    </Pressable>
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs text-muted-foreground text-right mb-1">
                      تاريخ الانتهاء (YYYY-MM-DD)
                    </Text>
                    <TextInput
                      className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                      value={subEndDate}
                      onChangeText={setSubEndDate}
                      placeholder="2025-01-31"
                      placeholderTextColor="#BDBDBD"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <CreditCard size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">الخطة</Text>
                      <Text className="text-sm text-foreground text-right">
                        {data.subscription.planName || '—'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground text-right">الحالة</Text>
                      <View className="flex-row-reverse items-center mt-1">
                        <Badge
                          className={STATUS_COLORS[data.subscription.status] || 'bg-gray-500'}
                        >
                          <Text className="text-white text-xs">
                            {STATUS_LABELS[data.subscription.status] || data.subscription.status}
                          </Text>
                        </Badge>
                      </View>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3 border-b border-border">
                    <Calendar size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">تاريخ البدء</Text>
                      <Text className="text-sm text-foreground text-right">
                        {formatDate(data.subscription.startDate)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row-reverse items-center py-3">
                    <Calendar size={18} color="#8C8C8C" />
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-muted-foreground text-right">تاريخ الانتهاء</Text>
                      <Text className="text-sm text-foreground text-right">
                        {formatDate(data.subscription.endDate)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </Card>

          {/* Reservations Card */}
          <Card className="bg-white border border-border rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <View className="flex-row-reverse items-center mb-4">
                <Calendar size={20} color="#A68CD4" />
                <Text className="text-lg font-bold text-foreground text-right mr-2">
                  الحجوزات
                </Text>
              </View>

              {/* Usage Summary */}
              <View className="flex-row-reverse mb-4">
                <View className="flex-1 items-end border-l border-border pl-2">
                  <Text className="text-xs text-muted-foreground">هذا الشهر</Text>
                  <Text className="text-base font-medium text-foreground">
                    {data.usage.monthlyLimit > 0
                      ? `${data.usage.monthlyUsed}/${data.usage.monthlyLimit}`
                      : '—'}
                  </Text>
                </View>
                <View className="flex-1 items-end border-l border-border pl-2">
                  <Text className="text-xs text-muted-foreground">هذا الأسبوع</Text>
                  <Text className="text-base font-medium text-foreground">
                    {data.usage.weeklyUsed}/{data.usage.weeklyLimit}
                  </Text>
                </View>
                <View className="flex-1 items-end">
                  <Text className="text-xs text-muted-foreground">المجموع</Text>
                  <Text className="text-base font-medium text-foreground">
                    {data.usage.lifetime}
                  </Text>
                </View>
              </View>

              {/* Reservations List */}
              {data.reservations.items.length === 0 ? (
                <Text className="text-sm text-muted-foreground text-right">
                  لا توجد حجوزات
                </Text>
              ) : (
                data.reservations.items.map((reservation) => (
                  <View
                    key={reservation.id}
                    className="flex-row-reverse items-center py-2 border-b border-border"
                  >
                    <View className="flex-1">
                      <Text className="text-sm text-foreground text-right">
                        {formatDate(reservation.startAt)} - {formatTime(reservation.startAt)}
                      </Text>
                      {reservation.coachName && (
                        <Text className="text-xs text-muted-foreground text-right">
                          {reservation.coachName}
                        </Text>
                      )}
                    </View>
                    <Badge
                      className={
                        reservation.status === 'booked'
                          ? 'bg-green-500'
                          : reservation.status === 'attended'
                          ? 'bg-blue-500'
                          : 'bg-gray-500'
                      }
                    >
                      <Text className="text-white text-xs">
                        {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
                      </Text>
                    </Badge>
                  </View>
                ))
              )}

              {data.reservations.total > 10 && (
                <Text className="text-xs text-muted-foreground text-center mt-2">
                  عرض آخر 10 من {data.reservations.total} حجز
                </Text>
              )}
            </View>
          </Card>

          {/* Admin Notes Card */}
          <Card className="bg-white border border-border rounded-2xl shadow-sm mt-4">
            <View className="p-4">
              <View className="flex-row-reverse items-center justify-between mb-4">
                <View className="flex-row-reverse items-center">
                  <FileText size={20} color="#A68CD4" />
                  <Text className="text-lg font-bold text-foreground text-right mr-2">
                    ملاحظات داخلية
                  </Text>
                </View>
                {!isEditingNotes ? (
                  <Pressable className="p-2" onPress={() => setIsEditingNotes(true)}>
                    <Edit size={18} color="#8C8C8C" />
                  </Pressable>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      className="p-2"
                      onPress={handleCancelNotes}
                      disabled={isSavingNotes}
                    >
                      <X size={18} color="#EF4444" />
                    </Pressable>
                    <Pressable
                      className="p-2"
                      onPress={() => void handleSaveNotes()}
                      disabled={isSavingNotes}
                    >
                      {isSavingNotes ? (
                        <ActivityIndicator size="small" color="#A68CD4" />
                      ) : (
                        <Check size={18} color="#22C55E" />
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              {isEditingNotes ? (
                <TextInput
                  className="bg-muted rounded-lg px-3 py-2 text-right text-foreground"
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="أضيفي ملاحظات داخلية..."
                  placeholderTextColor="#BDBDBD"
                  multiline
                  numberOfLines={4}
                  style={{ textAlignVertical: 'top', minHeight: 100 }}
                />
              ) : (
                <Text className="text-sm text-foreground text-right">
                  {data.notes.adminNotes || 'لا توجد ملاحظات'}
                </Text>
              )}
            </View>
          </Card>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Subscription Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowStatusModal(false)}
        >
          <View className="bg-white rounded-2xl w-80 overflow-hidden">
            <View className="p-4 border-b border-border">
              <Text className="text-lg font-bold text-foreground text-center">
                اختاري الحالة
              </Text>
            </View>
            {(['active', 'pending', 'rejected', 'cancelled', 'expired'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                className={`p-4 border-b border-border ${
                  subStatus === status ? 'bg-primary/10' : ''
                }`}
                onPress={() => {
                  setSubStatus(status);
                  setShowStatusModal(false);
                }}
              >
                <Text
                  className={`text-center ${
                    subStatus === status ? 'text-primary font-bold' : 'text-foreground'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default AdminCustomerDetailsScreen;

// src/screens/Admin/AdminCustomersScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  Users,
  ChevronDown,
  AlertTriangle,
  UserPlus,
} from 'lucide-react-native';
import { Card, Button, Badge, Switch } from '../../components/UI';
import { useAdminGetCustomersQuery } from '../../features/api/apiSlice';

// Define param list inline to avoid circular imports
type AdminCustomersStackParamList = {
  AdminCustomersList: undefined;
  AdminCustomerDetails: { customerId: string };
};

type Nav = NativeStackNavigationProp<AdminCustomersStackParamList, 'AdminCustomersList'>;

// Status labels and colors
const STATUS_LABELS: Record<string, string> = {
  all: 'الكل',
  active: 'نشط',
  expiring: 'ينتهي قريباً',
  expired: 'منتهي',
  'no-subscription': 'بدون اشتراك',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-500',
  expired: 'bg-gray-500',
};

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  pending: 'قيد الانتظار',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
  expired: 'منتهي',
};

type StatusFilter = 'all' | 'active' | 'expiring' | 'expired' | 'no-subscription';

const REFETCH_DEBOUNCE_MS = 1000;

export const AdminCustomersScreen = () => {
  if (__DEV__) {
    console.log('[AdminCustomersScreen] MOUNTED');
  }
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const lastRefetchAt = useRef<number>(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 500);
  };

  // C-STATE-03: clear pending debounce timer on unmount so the orphaned
  // setDebouncedSearch never fires on an unmounted component.
  React.useEffect(
    () => () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    },
    []
  );

  // Query
  const { data, isLoading, isFetching, refetch } = useAdminGetCustomersQuery({
    q: debouncedSearch || undefined,
    status: statusFilter,
    activeOnly: activeOnly ? 'true' : 'false',
  });

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

  React.useEffect(() => {
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

  const customers = data?.items || [];
  const total = data?.total || 0;

  const navigateToDetails = (customerId: string) => {
    navigation.navigate('AdminCustomerDetails', { customerId });
  };

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
              <Users size={28} color="#FFFFFF" />
              <Text className="text-2xl font-bold text-white mr-2">الزبونات</Text>
            </View>
            <Pressable
              className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center"
              onPress={() => {
                // Future: Add customer modal
              }}
            >
              <UserPlus size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text className="text-sm text-white/90 text-right">
            إدارة معلومات الزبونات والاشتراكات
          </Text>
          <Text className="text-xs text-white/70 text-right mt-1">
            {total} زبونة
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        className="flex-1 px-2"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="space-y-4 pt-4 p-2">
          {/* Filters Card */}
          <Card className="bg-white border border-border rounded-2xl shadow-sm mt-2">
            <View className="p-4">
              {/* Search Input */}
              <View className="flex-row-reverse items-center bg-card border border-border rounded-xl h-12 px-4 mb-3">
                <Search size={20} color="#8C8C8C" />
                <TextInput
                  className="flex-1 text-right text-foreground mr-2"
                  placeholder="ابحثي بالاسم أو رقم الهاتف أو البريد"
                  placeholderTextColor="#8C8C8C"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                />
              </View>

              {/* Status Filter */}
              <Pressable
                className="flex-row-reverse items-center justify-between bg-card border border-border rounded-xl h-12 px-4 mb-3"
                onPress={() => setShowStatusModal(true)}
              >
                <Text className="text-foreground text-right">
                  الحالة: {STATUS_LABELS[statusFilter]}
                </Text>
                <ChevronDown size={20} color="#8C8C8C" />
              </Pressable>

              {/* Active Only Toggle */}
              <View className="flex-row-reverse items-center justify-between">
                <Text className="text-foreground text-right">
                  عرض الزبونات النشطات فقط
                </Text>
                <Switch value={activeOnly} onValueChange={setActiveOnly} />
              </View>
            </View>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#A68CD4" />
            </View>
          )}

          {/* Empty State */}
          {!isLoading && customers.length === 0 && (
            <Card className="bg-white border border-border rounded-2xl shadow-sm mt-4">
              <View className="p-6 items-center">
                <Users size={48} color="#8C8C8C" />
                <Text className="text-lg font-bold text-foreground mt-4">
                  لا توجد زبونات مطابقة لبحثك
                </Text>
                <Button
                  variant="outline"
                  className="mt-4"
                  onPress={() => {
                    setSearchQuery('');
                    setDebouncedSearch('');
                    setStatusFilter('all');
                    setActiveOnly(false);
                  }}
                >
                  إعادة تعيين الفلاتر
                </Button>
              </View>
            </Card>
          )}

          {/* Customers List */}
          {!isLoading &&
            customers.map((customer) => (
              <Card
                key={customer.id}
                className="bg-white border border-border rounded-2xl shadow-sm mt-4"
              >
                <View className="p-4">
                  {/* Name + Status */}
                  <View className="flex-row-reverse items-center justify-between mb-2">
                    <Text className="text-lg font-bold text-foreground text-right">
                      {customer.firstName || ''} {customer.lastName || customer.email}
                    </Text>
                    {customer.subscription && (
                      <Badge
                        className={`${STATUS_COLORS[customer.subscription.status] || 'bg-gray-500'}`}
                      >
                        <Text className="text-white text-xs">
                          {SUBSCRIPTION_STATUS_LABELS[customer.subscription.status] ||
                            customer.subscription.status}
                        </Text>
                      </Badge>
                    )}
                    {!customer.subscription && (
                      <Badge className="bg-gray-400">
                        <Text className="text-white text-xs">بدون اشتراك</Text>
                      </Badge>
                    )}
                  </View>

                  {/* Phone + Email */}
                  <View className="mb-3">
                    {customer.phone && (
                      <Text className="text-sm text-muted-foreground text-right">
                        {customer.phone}
                      </Text>
                    )}
                    <Text className="text-xs text-muted-foreground text-right">
                      {customer.email}
                    </Text>
                  </View>

                  {/* Stats Row */}
                  <View className="flex-row-reverse mb-3">
                    <View className="flex-1 items-end">
                      <Text className="text-xs text-muted-foreground">مجموع الجلسات</Text>
                      <Text className="text-base font-medium text-foreground">
                        {customer.usage.lifetime}
                      </Text>
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-xs text-muted-foreground">هذا الشهر</Text>
                      <Text className="text-base font-medium text-foreground">
                        {customer.usage.monthlyLimit > 0
                          ? `${customer.usage.monthlyUsed}/${customer.usage.monthlyLimit}`
                          : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Health Warning */}
                  {customer.health.healthStatus &&
                    customer.health.healthStatus !== 'لا يوجد' &&
                    customer.health.healthStatus !== 'بصحة جيدة' && (
                      <View className="bg-yellow-500/10 rounded-lg p-2 mb-3 flex-row-reverse items-center">
                        <AlertTriangle size={16} color="#B45309" />
                        <Text className="text-yellow-700 text-sm mr-2 flex-1 text-right">
                          تنبيه صحي: {customer.health.healthStatus}
                        </Text>
                      </View>
                    )}

                  {/* View Details Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onPress={() => navigateToDetails(customer.id)}
                  >
                    عرض التفاصيل
                  </Button>
                </View>
              </Card>
            ))}
        </View>
      </ScrollView>

      {/* Status Filter Modal */}
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
            {(
              ['all', 'active', 'expiring', 'expired', 'no-subscription'] as StatusFilter[]
            ).map((status) => (
              <TouchableOpacity
                key={status}
                className={`p-4 border-b border-border ${
                  statusFilter === status ? 'bg-primary/10' : ''
                }`}
                onPress={() => {
                  setStatusFilter(status);
                  setShowStatusModal(false);
                }}
              >
                <Text
                  className={`text-center ${
                    statusFilter === status ? 'text-primary font-bold' : 'text-foreground'
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

export default AdminCustomersScreen;

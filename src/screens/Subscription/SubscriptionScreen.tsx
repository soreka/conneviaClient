// src/screens/Subscription/SubscriptionScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, AppState } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock, ArrowRight, CreditCard } from 'lucide-react-native';
import {
  useGetMySubscriptionQuery,
  useGetMySubscriptionUsageQuery,
} from '../../features/api/apiSlice';
import {
  AnimatedCard,
  SkeletonSubscription,
  SubscriptionHeader,
  SubscriptionDetailsCard,
  WeeklyUsageCard,
  MonthlySummaryCard,
  ExpiringWarningCard,
  NoSubscriptionCard,
  SubscriptionInfoCard,
  ContactCard,
} from './components';

type SubscriptionStatus = 'pending' | 'active' | 'rejected' | 'cancelled' | 'expired' | 'expiring_soon';

const REFETCH_DEBOUNCE_MS = 1000;

const ACTION_LABELS: Record<string, string> = {
  renew: 'تمديد الاشتراك',
  upgrade_current_month: 'ترقية الشهر الحالي',
  upgrade_next_month: 'ترقية للشهر القادم',
  downgrade_next_month: 'تخفيض للشهر القادم',
};

export const SubscriptionScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [refreshing, setRefreshing] = useState(false);

  // Refs for stable callback (prevent infinite loop)
  const isFetchingRef = useRef(false);
  const lastRefetchAtRef = useRef(0);

  const {
    data: subscriptionData,
    isLoading: subLoading,
    isFetching: subFetching,
    refetch: refetchSub,
  } = useGetMySubscriptionQuery();

  const {
    data: usageData,
    isLoading: usageLoading,
    isFetching: usageFetching,
    refetch: refetchUsage,
  } = useGetMySubscriptionUsageQuery();

  const isFetching = subFetching || usageFetching;
  const isLoading = subLoading || usageLoading;

  // Sync isFetching to ref (for stable callback access)
  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  // Guarded refetch with debounce - STABLE callback (no isFetching in deps)
  const asyncGuardedRefetch = useCallback(async () => {
    // Guard 1: Skip if already fetching
    if (isFetchingRef.current) return;

    // Guard 2: Debounce check
    const now = Date.now();
    if (now - lastRefetchAtRef.current < REFETCH_DEBOUNCE_MS) return;

    // Update timestamp BEFORE calling refetch
    lastRefetchAtRef.current = now;

    await Promise.all([refetchSub(), refetchUsage()]);
  }, [refetchSub, refetchUsage]);

  // Refetch on focus - stable callback reference
  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
      return () => {};
    }, [asyncGuardedRefetch])
  );

  // Refetch on app state change (background → foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void asyncGuardedRefetch();
    });
    return () => subscription.remove();
  }, [asyncGuardedRefetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force refetch on pull-to-refresh (bypass debounce)
      lastRefetchAtRef.current = 0;
      await asyncGuardedRefetch();
    } finally {
      setRefreshing(false);
    }
  }, [asyncGuardedRefetch]);

  const handleViewPlans = () => {
    navigation.navigate('SubscriptionPlans');
  };

  // New API shape: current/next/pending
  const current = subscriptionData?.current;
  const next = subscriptionData?.next;
  const pending = subscriptionData?.pending;
  const usage = usageData?.usage;

  // Determine subscription display status
  const getDisplayStatus = (): SubscriptionStatus => {
    if (pending) return 'pending';
    if (!current) return 'expired';

    const now = new Date();
    const endDate = new Date(current.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (current.status === 'active') {
      if (daysRemaining <= 0) return 'expired';
      if (daysRemaining <= 7) return 'expiring_soon';
      return 'active';
    }

    return current.status as SubscriptionStatus;
  };

  const displayStatus = getDisplayStatus();
  const hasActiveOrPending = current?.status === 'active' || pending;

  // Calculate days remaining for expiring warning
  const getDaysRemaining = () => {
    if (!current?.endDate) return 0;
    const now = new Date();
    const endDate = new Date(current.endDate);
    return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Format price from agorot to shekels
  const formatPrice = (priceAgorot: number) => {
    return `${(priceAgorot / 100).toFixed(0)} ₪`;
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white">
        <SkeletonSubscription />
      </View>
    );
  }

  // No subscription and no pending submission
  const showNoSubscription = !current && !pending;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#8b5cf6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AnimatedCard index={0}>
          <SubscriptionHeader
            title="اشتراكي"
            subtitle={hasActiveOrPending ? 'إدارة اشتراكك ومتابعة استخدامك' : undefined}
          />
        </AnimatedCard>

        {/* No subscription state */}
        {showNoSubscription && (
          <AnimatedCard index={1}>
            <NoSubscriptionCard onViewPlans={handleViewPlans} />
          </AnimatedCard>
        )}

        {/* Expiring warning */}
        {displayStatus === 'expiring_soon' && current?.endDate && (
          <AnimatedCard index={1}>
            <ExpiringWarningCard
              daysRemaining={getDaysRemaining()}
              endDate={current.endDate}
              onRenew={handleViewPlans}
            />
          </AnimatedCard>
        )}

        {/* Pending submission notice */}
        {pending && (
          <AnimatedCard index={1}>
            <View className="bg-yellow-50 rounded-2xl p-4 mb-4 border border-yellow-200">
              <View className="flex-row-reverse items-center mb-2">
                <View className="w-8 h-8 bg-yellow-200 rounded-full items-center justify-center ml-2">
                  <Clock size={16} color="#ca8a04" />
                </View>
                <Text className="text-base font-bold text-yellow-800 text-right">
                  {ACTION_LABELS[pending.requestedAction] || 'طلب قيد المراجعة'}
                </Text>
              </View>
              <Text className="text-sm text-yellow-700 text-right">
                لديك طلب قيد المراجعة من قبل الإدارة. سيتم إشعارك عند الموافقة.
              </Text>
              {pending.plan && (
                <>
                  <Text className="text-sm text-yellow-600 text-right mt-2">
                    الباقة: {pending.plan.name} ({pending.plan.monthlyLimit} جلسات/شهر)
                  </Text>
                  <Text className="text-sm font-bold text-yellow-700 text-right mt-1">
                    المبلغ: ₪{pending.plan.price}
                  </Text>
                </>
              )}
              <Text className="text-xs text-yellow-500 text-right mt-1">
                طريقة الدفع: {pending.method === 'cash' ? 'نقداً' : 'تحويل بنكي'}
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* Current subscription details card */}
        {current && (
          <AnimatedCard index={2}>
            <SubscriptionDetailsCard
              planName={current.plan?.name || 'باقة غير محددة'}
              monthlyLimit={current.plan?.monthlyLimit || 0}
              status={displayStatus}
              startDate={current.startDate}
              endDate={current.endDate}
              price={current.plan ? formatPrice(current.plan.price) : undefined}
            />
          </AnimatedCard>
        )}

        {/* Next subscription card */}
        {next && (
          <AnimatedCard index={3}>
            <View className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-200">
              <View className="flex-row-reverse items-center mb-2">
                <View className="w-8 h-8 bg-blue-200 rounded-full items-center justify-center ml-2">
                  <ArrowRight size={16} color="#2563eb" />
                </View>
                <Text className="text-base font-bold text-blue-800 text-right">
                  اشتراك قادم
                </Text>
              </View>
              {next.plan && (
                <>
                  <Text className="text-sm text-blue-700 text-right">
                    الباقة: {next.plan.name} ({next.plan.monthlyLimit} جلسات/شهر)
                  </Text>
                  <Text className="text-xs text-blue-600 text-right mt-1">
                    يبدأ في: {new Date(next.startDate).toLocaleDateString('ar-EG')}
                  </Text>
                </>
              )}
            </View>
          </AnimatedCard>
        )}

        {/* Monthly usage card */}
        {usage && current?.status === 'active' && (
          <AnimatedCard index={4}>
            <View className="bg-purple-50 rounded-2xl p-4 mb-4 border border-purple-200">
              <Text className="text-base font-bold text-purple-800 text-right mb-3">
                استخدام الجلسات
              </Text>
              
              {/* Monthly usage */}
              <View className="mb-4">
                <View className="flex-row-reverse justify-between mb-1">
                  <Text className="text-sm text-purple-700 text-right">الجلسات الشهرية</Text>
                  <Text className="text-sm text-purple-900 font-bold">
                    {usage.monthlyUsed} / {usage.monthlyLimit}
                  </Text>
                </View>
                <View className="h-3 bg-purple-200 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-purple-600 rounded-full" 
                    style={{ width: `${Math.min(100, (usage.monthlyUsed / usage.monthlyLimit) * 100)}%` }}
                  />
                </View>
                <Text className="text-xs text-purple-500 text-right mt-1">
                  متبقي: {usage.monthlyLeft} جلسات
                </Text>
              </View>

              {/* Weekly usage (global cap) */}
              <View>
                <View className="flex-row-reverse justify-between mb-1">
                  <Text className="text-sm text-purple-700 text-right">الحد الأسبوعي</Text>
                  <Text className="text-sm text-purple-900 font-bold">
                    {usage.weeklyUsed} / {usage.weeklyLimit}
                  </Text>
                </View>
                <View className="h-3 bg-purple-200 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ width: `${Math.min(100, (usage.weeklyUsed / usage.weeklyLimit) * 100)}%` }}
                  />
                </View>
                <Text className="text-xs text-purple-500 text-right mt-1">
                  متبقي هذا الأسبوع: {usage.weeklyLeft} جلسات
                </Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* Monthly summary card - placeholder for now */}
        {current?.status === 'active' && (
          <AnimatedCard index={5}>
            <MonthlySummaryCard attendedSessionsThisMonth={0} />
          </AnimatedCard>
        )}

        {/* Info card */}
        {hasActiveOrPending && (
          <AnimatedCard index={6}>
            <SubscriptionInfoCard />
          </AnimatedCard>
        )}

        {/* View/Change plans button */}
        <AnimatedCard index={7}>
          <TouchableOpacity
            onPress={handleViewPlans}
            className="bg-purple-600 rounded-xl py-4 mb-4"
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-center text-base">
              {hasActiveOrPending ? 'تغيير الباقة' : 'عرض خطط الاشتراك'}
            </Text>
          </TouchableOpacity>
        </AnimatedCard>

        {/* Contact card */}
        <AnimatedCard index={8}>
          <ContactCard />
        </AnimatedCard>
      </ScrollView>
    </View>
  );
};

export default SubscriptionScreen;

// src/screens/Dashboard/DashboardScreen.tsx
import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View, ScrollView, RefreshControl, AppState, Animated, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../app/hooks';
import { selectCurrentUser } from '../../features/auth/authSlice';
import {
  useGetMyReservationsQuery,
  useGetMySubscriptionQuery,
  useGetMySubscriptionUsageQuery,
} from '../../features/api/apiSlice';
import {
  DashboardHeader,
  NextBookingCard,
  QuickActionsGrid,
  UsageCard,
  DailyTipCard,
  NextBookingCardSkeleton,
  QuickActionsGridSkeleton,
  UsageCardSkeleton,
  DailyTipCardSkeleton,
  getTipOfDay,
} from './components';
import { RefreshCw } from 'lucide-react-native';

const REFETCH_DEBOUNCE_MS = 1000;

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(selectCurrentUser);
  
  // Animation values for cards
  const bookingCardAnim = useRef(new Animated.Value(0)).current;
  const quickActionsAnim = useRef(new Animated.Value(0)).current;
  const usageCardAnim = useRef(new Animated.Value(0)).current;
  const tipCardAnim = useRef(new Animated.Value(0)).current;

  // Refs for stable refetch (prevent infinite loops)
  const isFetchingRef = useRef(false);
  const lastRefetchAtRef = useRef(0);
  const [refreshing, setRefreshing] = React.useState(false);

  // Data queries
  const {
    data: upcomingData,
    isLoading: bookingLoading,
    isFetching: bookingFetching,
    error: bookingError,
    refetch: refetchBooking,
  } = useGetMyReservationsQuery({ mode: 'upcoming', limit: 1 });

  const {
    data: subscriptionData,
    isLoading: subLoading,
    isFetching: subFetching,
    error: subError,
    refetch: refetchSubscription,
  } = useGetMySubscriptionQuery();

  const {
    data: usageData,
    isLoading: usageLoading,
    isFetching: usageFetching,
    error: usageError,
    refetch: refetchUsage,
  } = useGetMySubscriptionUsageQuery();

  // Derived state
  const nextBooking = upcomingData?.reservations?.[0] || null;
  const hasSubscription = !!subscriptionData?.current;
  const usage = usageData?.usage || null;
  const tipOfDay = useMemo(() => getTipOfDay(), []);

  // Loading states
  const isInitialLoading = bookingLoading || subLoading || usageLoading;
  const isFetching = bookingFetching || subFetching || usageFetching;

  // Sync isFetching to ref
  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  // Entry animations
  useEffect(() => {
    if (!isInitialLoading) {
      // Staggered animation sequence
      Animated.stagger(100, [
        Animated.timing(bookingCardAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(quickActionsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(usageCardAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(tipCardAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isInitialLoading, bookingCardAnim, quickActionsAnim, usageCardAnim, tipCardAnim]);

  // Guarded refetch with debounce - STABLE callback
  const asyncGuardedRefetch = useCallback(async () => {
    if (isFetchingRef.current) return;

    const now = Date.now();
    if (now - lastRefetchAtRef.current < REFETCH_DEBOUNCE_MS) return;

    lastRefetchAtRef.current = now;

    await Promise.all([
      refetchBooking(),
      refetchSubscription(),
      refetchUsage(),
    ]);
  }, [refetchBooking, refetchSubscription, refetchUsage]);

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
      return () => {};
    }, [asyncGuardedRefetch])
  );

  // Refetch on app state change
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void asyncGuardedRefetch();
    });
    return () => subscription.remove();
  }, [asyncGuardedRefetch]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      lastRefetchAtRef.current = 0; // Bypass debounce for manual refresh
      await Promise.all([
        refetchBooking(),
        refetchSubscription(),
        refetchUsage(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchBooking, refetchSubscription, refetchUsage]);

  // Navigation handlers
  const handleNotificationPress = () => {
    // TODO: Navigate to notifications screen when implemented
  };

  const handleAvatarPress = () => {
    navigation.navigate('Profile');
  };

  const handleViewAllBookings = () => {
    navigation.navigate('MyReservations');
  };

  const handleBookSession = () => {
    navigation.navigate('Schedule');
  };

  const handleViewSubscription = () => {
    navigation.navigate('MySubscription');
  };

  // Animation styles
  const getAnimatedStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  });

  // Error retry component
  const ErrorRetry: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <View className="flex-row items-center justify-center py-2">
      <TouchableOpacity
        onPress={onRetry}
        className="flex-row items-center bg-red-50 px-4 py-2 rounded-lg"
        activeOpacity={0.7}
      >
        <Text className="text-red-600 text-sm ml-2">تعذر تحميل البيانات</Text>
        <RefreshCw size={16} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8b5cf6']}
            tintColor="#8b5cf6"
          />
        }
      >
        {/* Header */}
        <DashboardHeader
          userName={user?.email}
          hasNotifications={false}
          onNotificationPress={handleNotificationPress}
          onAvatarPress={handleAvatarPress}
        />

        {/* Content */}
        {isInitialLoading ? (
          <>
            <NextBookingCardSkeleton />
            <QuickActionsGridSkeleton />
            <UsageCardSkeleton />
            <DailyTipCardSkeleton />
          </>
        ) : (
          <>
            {/* Next Booking Card */}
            {bookingError ? (
              <View style={{ marginTop: -40 }}>
                <ErrorRetry onRetry={() => refetchBooking()} />
              </View>
            ) : (
              <Animated.View style={getAnimatedStyle(bookingCardAnim)}>
                <NextBookingCard
                  booking={nextBooking}
                  onViewAllPress={handleViewAllBookings}
                  onBookNowPress={handleBookSession}
                />
              </Animated.View>
            )}

            {/* Quick Actions */}
            <Animated.View style={getAnimatedStyle(quickActionsAnim)}>
              <QuickActionsGrid
                onBookSession={handleBookSession}
                onViewBookings={handleViewAllBookings}
                onViewSubscription={handleViewSubscription}
              />
            </Animated.View>

            {/* Usage Card */}
            {usageError ? (
              <View className="mx-5 mt-4">
                <ErrorRetry onRetry={() => refetchUsage()} />
              </View>
            ) : (
              <Animated.View style={getAnimatedStyle(usageCardAnim)}>
                <UsageCard
                  usage={usage}
                  hasSubscription={hasSubscription}
                  onViewPlansPress={handleViewSubscription}
                />
              </Animated.View>
            )}

            {/* Daily Tip */}
            <Animated.View style={getAnimatedStyle(tipCardAnim)}>
              <DailyTipCard tip={tipOfDay} />
            </Animated.View>
          </>
        )}

        {/* Bottom spacing */}
        <View className="h-4" />
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;

/*
 * TEST CHECKLIST:
 * 1) Customer with upcoming booking -> sees booking card filled with date, time, bed number, status badge
 * 2) Customer without upcoming booking -> sees empty state with "لا يوجد لديك أي حجز قادم" + CTA "احجزي حصة الآن"
 * 3) Customer with active subscription -> sees usage card with weekly (X/3) and monthly (X/limit) progress bars
 * 4) Customer without subscription -> sees "لا يوجد اشتراك نشط حالياً" + CTA "عرض خيارات الاشتراك"
 * 5) Pull-to-refresh triggers all refetches once (no loops) - verify with console.log in refetch functions
 * 6) RTL layout correct on header - greeting on right, avatar on right, bell on left
 * 7) Skeleton loading visible on first load before data arrives
 * 8) Entry animations play sequentially after data loads
 * 9) Navigation works: Quick actions navigate to Schedule, MyReservations, MySubscription tabs
 * 10) Avatar tap navigates to Profile tab
 */

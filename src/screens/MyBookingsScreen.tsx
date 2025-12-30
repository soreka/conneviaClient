import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, AppState, Alert } from 'react-native';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useGetMyReservationsQuery, useCancelReservationMutation } from '../features/api/apiSlice';
import { 
  MyBookingsHeader, 
  BookingsTabs, 
  ReservationCard,
  BookingDetailsModal,
  CancelConfirmationModal,
  type BookingTabType,
  type ReservationStatus,
  type BookingDetails,
} from './MyBookings/components';
import { formatArabicDate } from '../utils/dates';

// Arabic day names for consistency
const ARABIC_DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

// Format time to Arabic style (e.g., "04:00 مساءً")
const formatArabicTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  const isPM = hours >= 12;
  const hour12 = hours % 12 || 12;
  const hourStr = hour12.toString().padStart(2, '0');
  const period = isPM ? 'مساءً' : 'صباحاً';
  
  return `${hourStr}:${minutes} ${period}`;
};

// Format time range for display
const formatTimeRange = (startsAt: string, durationMin: number): string => {
  const startDate = new Date(startsAt);
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
  
  const startTime = formatArabicTime(startsAt);
  const endTime = formatArabicTime(endDate.toISOString());
  
  return `${startTime} - ${endTime}`;
};

const REFETCH_DEBOUNCE_MS = 1000;
const CANCEL_CUTOFF_HOURS = 48;
const TIMEZONE = 'Asia/Jerusalem';
const ISRAEL_OFFSET_HOURS = 2; // Israel Standard Time (IST) is UTC+2, DST is UTC+3

/**
 * Get timezone-aware date parts for Asia/Jerusalem using Intl.DateTimeFormat
 */
function getLocalDateParts(date: Date): { year: number; month: number; day: number; dayOfWeek: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  // Get day of week (0 = Sunday)
  const weekdayStr = getPart('weekday');
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = weekdays.indexOf(weekdayStr);

  return {
    year: parseInt(getPart('year'), 10),
    month: parseInt(getPart('month'), 10) - 1, // 0-indexed
    day: parseInt(getPart('day'), 10),
    dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 0,
  };
}

/**
 * Calculate past tab date range with month+week overlap rule
 * 
 * Rule: If we are in the first week of the month AND the current week started
 * in the previous month, include that overlapping week too.
 * 
 * Week definition: Sunday 00:00 → Saturday 23:59:59.999 in Asia/Jerusalem
 * 
 * Note: Uses fixed UTC+2 offset (Israel Standard Time). This is acceptable because:
 * - DST transitions don't affect the day-level boundaries we're computing
 * - The backend will apply proper timezone logic for final filtering
 */
function getPastTabDateRange(now: Date = new Date()): { from: string; to: string } {
  const { year, month, day, dayOfWeek } = getLocalDateParts(now);

  // Israel is UTC+2 (or UTC+3 in DST), use UTC+2 as base
  const offsetMs = ISRAEL_OFFSET_HOURS * 60 * 60 * 1000;

  // Calculate month start: 1st of current month at 00:00 Israel time
  // In UTC, this is (year, month, 1, 0, 0) - offset
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - offsetMs);
  
  // Calculate month end: 1st of next month at 00:00 Israel time
  const monthEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - offsetMs);

  // Calculate week start: Sunday of current week at 00:00 Israel time
  const weekStartDay = day - dayOfWeek; // Can go negative (previous month)
  const weekStart = new Date(Date.UTC(year, month, weekStartDay, 0, 0, 0, 0) - offsetMs);

  // Apply overlap rule: if weekStart < monthStart, use weekStart as from
  const from = weekStart < monthStart ? weekStart : monthStart;
  const to = monthEnd;

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export const MyBookingsScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] = useState<BookingTabType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  // Calculate past tab date range with month+week overlap rule
  const pastDateRange = useMemo(() => getPastTabDateRange(), []);
  
  // Separate queries for upcoming and past tabs
  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming,
    isFetching: upcomingFetching,
  } = useGetMyReservationsQuery({ mode: 'upcoming' });

  const {
    data: pastData,
    isLoading: pastLoading,
    error: pastError,
    refetch: refetchPast,
    isFetching: pastFetching,
  } = useGetMyReservationsQuery({
    mode: 'past',
    from: pastDateRange.from,
    to: pastDateRange.to,
  });

  const [cancelReservation, { isLoading: isCanceling }] = useCancelReservationMutation();

  // Derive loading/fetching/error states based on active tab
  const isLoading = activeTab === 'upcoming' ? upcomingLoading : pastLoading;
  const isFetching = activeTab === 'upcoming' ? upcomingFetching : pastFetching;
  const error = activeTab === 'upcoming' ? upcomingError : pastError;
  
  // Refetch guards
  const lastRefetchAt = useRef<number>(0);

  const asyncGuardedRefetch = useCallback(async () => {
    if (!isFocused) return;
    if (upcomingFetching || pastFetching) return;
    
    const now = Date.now();
    if (now - lastRefetchAt.current < REFETCH_DEBOUNCE_MS) return;
    
    lastRefetchAt.current = now;
    // Refetch both queries
    await Promise.all([refetchUpcoming(), refetchPast()]);
  }, [refetchUpcoming, refetchPast, upcomingFetching, pastFetching, isFocused]);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
    }, [asyncGuardedRefetch])
  );

  // Refetch when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void asyncGuardedRefetch();
    });
    return () => sub.remove();
  }, [asyncGuardedRefetch]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await asyncGuardedRefetch();
    } finally {
      setRefreshing(false);
    }
  }, [asyncGuardedRefetch]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Check if a reservation can be cancelled (48h rule)
  const canCancelReservation = (startsAt: string): boolean => {
    const now = new Date();
    const sessionStart = new Date(startsAt);
    const hoursUntil = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= CANCEL_CUTOFF_HOURS;
  };

  // Handle card press - open details modal
  const handleCardPress = (booking: BookingDetails) => {
    setSelectedBooking(booking);
    setDetailsModalVisible(true);
  };

  // Handle cancel button press in details modal
  const handleCancelPress = () => {
    setCancelModalVisible(true);
  };

  // Handle cancel confirmation
  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;
    
    try {
      await cancelReservation({ reservationId: selectedBooking.reservationId }).unwrap();
      setCancelModalVisible(false);
      setDetailsModalVisible(false);
      setSelectedBooking(null);
      await asyncGuardedRefetch();
      Alert.alert('تم الإلغاء', 'تم إلغاء حجزك بنجاح');
    } catch (err: any) {
      const errorMessage = err?.data?.error || 'فشل إلغاء الحجز';
      Alert.alert('خطأ', errorMessage);
    }
  };

  // Close modals
  const handleCloseDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedBooking(null);
  };

  const handleCloseCancelModal = () => {
    setCancelModalVisible(false);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white">
        <MyBookingsHeader onBackPress={handleBackPress} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#A68CD4" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white">
        <MyBookingsHeader onBackPress={handleBackPress} />
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-center">فشل تحميل الحجوزات</Text>
        </View>
      </View>
    );
  }

  // Data is already filtered and sorted by the backend
  const upcomingReservations = upcomingData?.reservations || [];
  const pastReservations = pastData?.reservations || [];

  const displayedReservations = activeTab === 'upcoming' 
    ? upcomingReservations 
    : pastReservations;
  
  const now = new Date();

  // Type for reservation items
  type ReservationItem = (typeof upcomingReservations)[number];

  // Determine reservation status for card display
  const getReservationStatus = (reservation: ReservationItem): ReservationStatus => {
    const sessionDate = new Date(reservation.session.startsAt);
    const isPast = sessionDate <= now;
    
    if (!isPast && reservation.status === 'booked') {
      return 'upcoming';
    }
    
    if (reservation.status === 'attended') {
      return 'attended';
    }
    
    if (reservation.status === 'canceled') {
      return 'missed'; // Canceled reservations shown as missed in past tab
    }
    
    // Default to missed for past reservations
    return 'missed';
  };

  return (
    <View className="flex-1 bg-white">
      <MyBookingsHeader onBackPress={handleBackPress} />
      
      <BookingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <FlatList
        data={displayedReservations}
        keyExtractor={(item) => item.reservationId}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#A68CD4']}
            tintColor="#A68CD4"
          />
        }
        renderItem={({ item }) => {
          const sessionDate = new Date(item.session.startsAt);
          const dayName = ARABIC_DAY_NAMES[sessionDate.getDay()];
          const dateLabel = formatArabicDate(sessionDate);
          const timeRange = formatTimeRange(item.session.startsAt, item.session.durationMin);
          const status = getReservationStatus(item);
          const isUpcoming = status === 'upcoming';
          const canCancel = isUpcoming && canCancelReservation(item.session.startsAt);
          
          // Get bed number from reservation
          const bedNumber = item.bedNumber;
          
          // Get session type - use typeLabel or title as fallback
          const sessionType = (item.session as any).typeLabel || 
                             (item.session as any).type || 
                             item.session.title || 
                             'بيلاتس أجهزة';

          // Build booking details for modal
          const bookingDetails: BookingDetails = {
            reservationId: item.reservationId,
            dayName,
            dateLabel,
            timeRange,
            bedNumber,
            sessionType,
            instructorName: item.session.instructorName,
            locationName: item.session.locationName,
            canCancel,
            isUpcoming,
          };

          return (
            <ReservationCard
              dayName={dayName}
              dateLabel={dateLabel}
              timeRange={timeRange}
              bedNumber={bedNumber}
              sessionType={sessionType}
              status={status}
              canCancel={canCancel}
              onPress={() => handleCardPress(bookingDetails)}
            />
          );
        }}
        ListEmptyComponent={
          <View className="py-12 items-center">
            <Text className="text-center text-gray-500 text-base">
              {activeTab === 'upcoming' 
                ? 'لا توجد حجوزات قادمة' 
                : 'لا توجد حجوزات سابقة'}
            </Text>
          </View>
        }
      />

      {/* Booking Details Modal */}
      <BookingDetailsModal
        visible={detailsModalVisible}
        booking={selectedBooking}
        onClose={handleCloseDetailsModal}
        onCancelPress={handleCancelPress}
      />

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        visible={cancelModalVisible}
        isLoading={isCanceling}
        onConfirm={handleConfirmCancel}
        onCancel={handleCloseCancelModal}
      />
    </View>
  );
};

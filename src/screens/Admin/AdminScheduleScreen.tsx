// src/screens/Admin/AdminScheduleScreen.tsx
// Role: Admin schedule screen with slot cards and details modal matching Lovable design
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Clock, Users, X, Edit2, Trash2, Plus } from 'lucide-react-native';
import { AdminScheduleHeader } from './components/AdminScheduleHeader';
import { EditBookingModal } from './components/EditBookingModal';
import { AddBookingModal } from './components/AddBookingModal';
import { EditSessionModal } from './components/EditSessionModal';
import { ConfirmCancelSessionModal } from './components/ConfirmCancelSessionModal';
import { ConfirmDeleteBookingModal } from './components/ConfirmDeleteBookingModal';
import { AddSessionModal, type NewSession } from './components/AddSessionModal';
import { WeekDayTabs, type DayItem } from '../../components/schedule/WeekDayTabs';
import {
  getStartOfWeek,
  getWeekDays,
  formatArabicDayName,
  formatArabicDate,
  isSameDay,
  formatTime,
  getEndTime,
} from '../../utils/dates';
import {
  SessionCore,
  getOccupancyPercent,
  isFull as isSessionFull,
  getAvailabilityBadge,
} from '../../types/scheduleCore';
import { AdminSessionDetails, BookingDetails } from '../../types/adminSchedule';
import {
  useGetAdminSessionsQuery,
  useLazyGetAdminSessionDetailsQuery,
  useCreateAdminSessionMutation,
  useUpdateAdminSessionMutation,
  useCancelAdminSessionMutation,
  useAddAdminBookingMutation,
  useDeleteAdminBookingMutation,
} from '../../features/api/apiSlice';
import { Alert } from 'react-native';

// Fallback mock data (used when API is unavailable or for development)
const FALLBACK_MOCK_SLOTS: AdminSlot[] = [
  {
    id: '1',
    title: 'يوغا صباحية',
    startsAt: '2024-12-22T08:00:00Z',
    durationMin: 60,
    capacity: 10,
    bookedCount: 7,
    type: 'يوغا',
    bookings: [],
  },
  {
    id: '2',
    title: 'بيلاتس',
    startsAt: '2024-12-22T10:00:00Z',
    durationMin: 45,
    capacity: 8,
    bookedCount: 8,
    type: 'بيلاتس',
    bookings: [],
  },
  {
    id: '3',
    title: 'تمارين القوة',
    startsAt: '2024-12-22T14:00:00Z',
    durationMin: 60,
    capacity: 12,
    bookedCount: 5,
    type: 'تمارين',
    bookings: [],
  },
];

// Flag to use real API vs mock data (set to true when backend is ready)
const USE_REAL_API = true;

// Local booking interface (compatible with BookingDetails)
interface LocalBooking {
  id: string;
  customerName: string;
  phone: string;
  bedNumber?: number;
}

// Admin slot interface (combines SessionCore with bookings for local state)
interface AdminSlot {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  bookedCount: number;
  type: string;
  bookings: LocalBooking[];
}

export const AdminScheduleScreen = () => {
  const navigation = useNavigation<any>();

  // Date range for API query
  const today = useMemo(() => new Date(), []);
  const startOfWeek = useMemo(() => getStartOfWeek(today, 0), [today]);
  const endOfWeek = useMemo(() => {
    const end = new Date(startOfWeek);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [startOfWeek]);

  // API Query for sessions list
  const {
    data: apiData,
    isLoading: apiLoading,
    isError: apiError,
    refetch: refetchSessions,
  } = useGetAdminSessionsQuery(
    { from: startOfWeek.toISOString(), to: endOfWeek.toISOString() },
    { skip: !USE_REAL_API }
  );

  // Convert API sessions to AdminSlot format (bookings loaded separately)
  const apiSlots: AdminSlot[] = useMemo(() => {
    if (!apiData?.sessions) return [];
    return apiData.sessions.map((s) => ({
      id: s.id,
      title: s.titleAr,
      startsAt: s.dateISO || '',
      durationMin: 60, // Default, could be derived from startTime/endTime
      capacity: s.capacityTotal,
      bookedCount: s.occupiedCount,
      type: s.titleAr,
      bookings: [], // Loaded on demand via details endpoint
    }));
  }, [apiData]);

  // Use API data if available, otherwise fallback to mock
  const slots = USE_REAL_API && apiData ? apiSlots : FALLBACK_MOCK_SLOTS;
  
  // Refs for stable callback (prevent infinite loop)
  const isFetchingRef = useRef(false);
  const lastRefetchAtRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const REFETCH_DEBOUNCE_MS = 1000;

  // Sync apiLoading to ref (for stable callback access)
  useEffect(() => {
    isFetchingRef.current = apiLoading;
  }, [apiLoading]);
  
  // Guarded refetch with debounce - STABLE callback (no apiLoading in deps)
  const asyncGuardedRefetch = useCallback(async () => {
    if (!USE_REAL_API) return;
    
    // Guard 1: Skip if already fetching
    if (isFetchingRef.current) return;
    
    // Guard 2: Debounce check
    const now = Date.now();
    if (now - lastRefetchAtRef.current < REFETCH_DEBOUNCE_MS) return;
    
    // Update timestamp BEFORE calling refetch
    lastRefetchAtRef.current = now;
    return refetchSessions();
  }, [refetchSessions]);
  
  // Refetch on focus - stable callback reference
  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
      return () => {};
    }, [asyncGuardedRefetch])
  );
  
  // Refetch when app returns from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void asyncGuardedRefetch();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [asyncGuardedRefetch]);
  
  // Pull-to-refresh handler
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
  
  // Selected slot and details loading
  const [selectedSlot, setSelectedSlot] = useState<AdminSlot | null>(null);
  const [selectedSlotBookings, setSelectedSlotBookings] = useState<LocalBooking[]>([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // RTK Query lazy query for loading session details with bookings
  const [triggerGetDetails] = useLazyGetAdminSessionDetailsQuery();
  
  // RTK Query mutations for admin actions
  const [createSession, { isLoading: isCreatingSession }] = useCreateAdminSessionMutation();
  const [updateSession, { isLoading: isUpdatingSession }] = useUpdateAdminSessionMutation();
  const [cancelSession, { isLoading: isCancellingSession }] = useCancelAdminSessionMutation();
  const [addBooking, { isLoading: isAddingBooking }] = useAddAdminBookingMutation();
  const [deleteBooking, { isLoading: isDeletingBooking }] = useDeleteAdminBookingMutation();
  
  // Modal states
  const [editBookingModalVisible, setEditBookingModalVisible] = useState(false);
  const [addBookingModalVisible, setAddBookingModalVisible] = useState(false);
  const [editSessionModalVisible, setEditSessionModalVisible] = useState(false);
  const [cancelSessionModalVisible, setCancelSessionModalVisible] = useState(false);
  const [deleteBookingModalVisible, setDeleteBookingModalVisible] = useState(false);
  const [addSessionModalVisible, setAddSessionModalVisible] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<LocalBooking | null>(null);

  // Helper to close all modals - ensures no two modals can be open
  const closeAllModals = () => {
    setDetailsModalVisible(false);
    setEditBookingModalVisible(false);
    setAddBookingModalVisible(false);
    setEditSessionModalVisible(false);
    setCancelSessionModalVisible(false);
    setDeleteBookingModalVisible(false);
    setAddSessionModalVisible(false);
  };

  const weekDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);

  const todayIndex = useMemo(() => {
    const index = weekDays.findIndex((day) => isSameDay(day, today));
    return index >= 0 ? index : 0;
  }, [weekDays, today]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const selectedDate = weekDays[selectedDayIndex];

  const daysWithSlots = useMemo((): DayItem[] => {
    return weekDays.map((date) => ({
      date,
      name: formatArabicDayName(date),
      enabled: true,
    }));
  }, [weekDays]);

  // Filter slots by selected day and sort by start time
  const sortedSlots = useMemo(() => {
    return [...slots]
      .filter((slot) => isSameDay(new Date(slot.startsAt), selectedDate))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [slots, selectedDate]);

  const handleViewDetails = (slot: AdminSlot) => {
    closeAllModals();
    setSelectedSlot(slot);
    setSelectedSlotBookings(slot.bookings || []);
    setDetailsModalVisible(true);
    
    // Load fresh details from API (with bookings)
    if (USE_REAL_API) {
      setDetailsLoading(true);
      triggerGetDetails(slot.id)
        .unwrap()
        .then((result) => {
          // Update bookings from API response
          const bookings: LocalBooking[] = result.session.bookings.map((b) => ({
            id: b.id,
            customerName: b.customerName,
            phone: b.phone || '',
          }));
          setSelectedSlotBookings(bookings);
          setDetailsLoading(false);
        })
        .catch(() => setDetailsLoading(false));
    }
  };

  const closeDetailsModal = () => {
    closeAllModals();
    setSelectedSlot(null);
  };

  // Edit Booking handlers
  const handleEditBooking = (booking: LocalBooking) => {
    closeAllModals();
    setSelectedBooking(booking);
    setEditBookingModalVisible(true);
  };

  const handleSaveBooking = (_updatedBooking: LocalBooking) => {
    closeAllModals();
    setSelectedBooking(null);
  };

  // Add Booking handlers
  const handleAddBooking = () => {
    closeAllModals();
    setAddBookingModalVisible(true);
  };

  const handleAddBookingSubmit = async (customerName: string, phone: string, bedNumber: number) => {
    if (!selectedSlot) return;
    
    try {
      await addBooking({
        sessionId: selectedSlot.id,
        customerName,
        phone,
        bedNumber,
      }).unwrap();
      
      // RTK Query auto-refetches via tag invalidation
      // Reload details to show new booking
      triggerGetDetails(selectedSlot.id)
        .unwrap()
        .then((result) => {
          const bookings: LocalBooking[] = result.session.bookings.map((b) => ({
            id: b.id,
            customerName: b.customerName,
            phone: b.phone || '',
            bedNumber: b.bedNumber,
          }));
          setSelectedSlotBookings(bookings);
        });
      
      closeAllModals();
      Alert.alert('تم', 'تمت إضافة الحجز بنجاح');
    } catch (error) {
      console.error('Failed to add booking:', error);
      Alert.alert('خطأ', 'فشل في إضافة الحجز');
    }
  };

  // Edit Session handlers
  const handleEditSession = () => {
    closeAllModals();
    setEditSessionModalVisible(true);
  };

  const handleSaveSession = async (updatedSession: {
    id: string;
    title: string;
    type: string;
    capacity: number;
    startsAt: string;
    durationMin: number;
    bookedCount?: number;
    bookings?: LocalBooking[];
  }) => {
    try {
      await updateSession({
        sessionId: updatedSession.id,
        title: updatedSession.title,
        durationMin: updatedSession.durationMin,
        capacity: updatedSession.capacity,
      }).unwrap();
      
      // RTK Query auto-refetches via tag invalidation
      closeAllModals();
      Alert.alert('تم', 'تم تحديث الحصة بنجاح');
    } catch (error) {
      console.error('Failed to update session:', error);
      Alert.alert('خطأ', 'فشل في تحديث الحصة');
    }
  };

  // Cancel Session handlers
  const handleCancelSession = () => {
    closeAllModals();
    setCancelSessionModalVisible(true);
  };

  const handleConfirmCancelSession = async () => {
    if (!selectedSlot) return;
    
    try {
      await cancelSession({
        sessionId: selectedSlot.id,
      }).unwrap();
      
      // RTK Query auto-refetches via tag invalidation
      closeAllModals();
      setSelectedSlot(null);
      Alert.alert('تم', 'تم إلغاء الحصة بنجاح');
    } catch (error) {
      console.error('Failed to cancel session:', error);
      Alert.alert('خطأ', 'فشل في إلغاء الحصة');
    }
  };

  // Delete Booking handlers
  const handleDeleteBooking = (booking: LocalBooking) => {
    closeAllModals();
    setSelectedBooking(booking);
    setDeleteBookingModalVisible(true);
  };

  const handleConfirmDeleteBooking = async () => {
    if (!selectedSlot || !selectedBooking) return;
    
    try {
      await deleteBooking({
        sessionId: selectedSlot.id,
        bookingId: selectedBooking.id,
      }).unwrap();
      
      // Remove from local bookings list immediately
      setSelectedSlotBookings((prev) => prev.filter((b) => b.id !== selectedBooking.id));
      
      closeAllModals();
      setSelectedBooking(null);
      Alert.alert('تم', 'تم حذف الحجز بنجاح');
    } catch (error) {
      console.error('Failed to delete booking:', error);
      Alert.alert('خطأ', 'فشل في حذف الحجز');
    }
  };

  // Add Session handlers
  const handleOpenAddSession = () => {
    closeAllModals();
    setAddSessionModalVisible(true);
  };

  const handleAddSessionSubmit = async (newSession: NewSession) => {
    // Calculate startsAt date based on selected day and time
    const baseDate = weekDays[newSession.dayIndex];
    const [hours, minutes] = newSession.startTime.split(':').map(Number);
    const startsAt = new Date(baseDate);
    startsAt.setHours(hours, minutes, 0, 0);

    // Calculate duration from start and end time
    const [endH, endM] = newSession.endTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = endH * 60 + endM;
    const durationMin = endMinutes - startMinutes;

    if (USE_REAL_API) {
      // Call API to create session
      try {
        await createSession({
          title: newSession.type,
          startsAt: startsAt.toISOString(),
          durationMin,
          capacity: newSession.capacity,
        }).unwrap();
        
        // Refetch sessions list to show new session
        refetchSessions();
        closeAllModals();
      } catch (error) {
        console.error('Failed to create session:', error);
        // TODO: Show error toast to user
      }
    } else {
      // Fallback: Add to local state (mock mode)
      const newSlot: AdminSlot = {
        id: `slot-${Date.now()}`,
        title: newSession.type,
        startsAt: startsAt.toISOString(),
        durationMin,
        capacity: newSession.capacity,
        bookedCount: 0,
        type: newSession.type,
        bookings: [],
      };
      // Note: setSlots won't work when using API data, only for mock mode
      closeAllModals();
    }
  };

  const renderSlotCard = ({ item }: { item: AdminSlot }) => {
    const isFull = item.bookedCount >= item.capacity;
    const startTime = formatTime(item.startsAt);
    const endTime = getEndTime(item.startsAt, item.durationMin);
    const timeRange = `${startTime} - ${endTime}`;
    const occupancyPercent = (item.bookedCount / item.capacity) * 100;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        {/* Header: Badge + Time */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <Clock size={16} color="#6b7280" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f2937', marginRight: 6 }}>
              {timeRange}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: isFull ? '#fef2f2' : '#f0fdf4',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: isFull ? '#dc2626' : '#16a34a',
              }}
            >
              {isFull ? 'ممتلئ' : 'متاح'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f2937', textAlign: 'right', marginBottom: 12 }}>
          {item.title}
        </Text>

        {/* Occupancy */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8 }}>
          <Users size={16} color="#6b7280" />
          <Text style={{ fontSize: 14, color: '#6b7280', marginRight: 6 }}>
            عدد الأسرة المشغولة: {item.bookedCount} / {item.capacity}
          </Text>
        </View>

        {/* Progress Bar - Gradient Pink → Purple */}
        <View
          style={{
            height: 6,
            backgroundColor: '#e5e7eb',
            borderRadius: 3,
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#F2C6DE', '#A68CD4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: '100%',
              width: `${occupancyPercent}%`,
              borderRadius: 3,
            }}
          />
        </View>

        {/* View Details Button */}
        <Pressable
          onPress={() => handleViewDetails(item)}
          style={{
            borderWidth: 1,
            borderColor: '#8b5cf6',
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#8b5cf6' }}>
            عرض التفاصيل
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderDetailsModal = () => {
    if (!detailsModalVisible || !selectedSlot) return null;

    const startTime = formatTime(selectedSlot.startsAt);
    const endTime = getEndTime(selectedSlot.startsAt, selectedSlot.durationMin);
    const timeRange = `${startTime} - ${endTime}`;

    return (
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDetailsModal}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '85%',
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937', textAlign: 'right' }}>
                  {selectedSlot.title}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'right', marginTop: 4 }}>
                  تفاصيل الحصة
                </Text>
              </View>
              <Pressable onPress={closeDetailsModal} style={{ padding: 8 }}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Info Block */}
              <View
                style={{
                  backgroundColor: '#f8f7fc',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>اليوم</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>
                    {formatArabicDayName(new Date(selectedSlot.startsAt))}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>الوقت</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>{timeRange}</Text>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>نوع الحصة</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>{selectedSlot.type}</Text>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>عدد الأسرة المشغولة</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>
                    {selectedSlot.bookedCount} / {selectedSlot.capacity}
                  </Text>
                </View>
              </View>

              {/* Bookings List */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937', textAlign: 'right', marginBottom: 12 }}>
                الحجوزات ({detailsLoading ? '...' : selectedSlotBookings.length})
              </Text>
              {detailsLoading ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                  <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>جاري تحميل الحجوزات...</Text>
                </View>
              ) : selectedSlotBookings.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>لا توجد حجوزات بعد</Text>
                </View>
              ) : null}
              {!detailsLoading && selectedSlotBookings.map((booking) => (
                <View
                  key={booking.id}
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f9fafb',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1 }}>
                    {booking.bedNumber && (
                      <View style={{
                        backgroundColor: '#8b5cf6',
                        borderRadius: 8,
                        width: 32,
                        height: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 12,
                      }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                          {booking.bedNumber}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f2937', textAlign: 'right' }}>
                        {booking.customerName}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'right' }}>
                        {booking.phone}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable onPress={() => handleEditBooking(booking)} style={{ padding: 8 }}>
                      <Edit2 size={18} color="#8b5cf6" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteBooking(booking)} style={{ padding: 8 }}>
                      <Trash2 size={18} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>
              ))}

              {/* Action Buttons */}
              <View style={{ marginTop: 20, marginBottom: 40 }}>
                <Pressable
                  onPress={handleEditSession}
                  style={{
                    backgroundColor: '#8b5cf6',
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                    تعديل بيانات الحصة
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleAddBooking}
                  style={{
                    borderWidth: 1,
                    borderColor: '#8b5cf6',
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#8b5cf6' }}>
                    إضافة زبونة يدويًا
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCancelSession}
                  style={{
                    backgroundColor: '#fef2f2',
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#dc2626' }}>
                    إلغاء الحصة
                  </Text>
                </Pressable>

                <Pressable
                  onPress={closeDetailsModal}
                  style={{
                    backgroundColor: '#f3f4f6',
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>
                    إغلاق
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const handleSettingsPress = () => {
    navigation.navigate('AdminScheduleSettings');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <AdminScheduleHeader onSettingsPress={handleSettingsPress} />

      {/* Day Tabs */}
      <WeekDayTabs
        days={daysWithSlots}
        selectedIndex={selectedDayIndex}
        onSelectDay={setSelectedDayIndex}
      />

      {/* Day Info */}
      <View
        style={{
          marginHorizontal: 16,
          marginVertical: 12,
          backgroundColor: '#f8f7fc',
          borderRadius: 12,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937' }}>
            {formatArabicDayName(selectedDate)}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            {formatArabicDate(selectedDate)}
          </Text>
        </View>
      </View>

      {/* Slots List */}
      <FlatList
        data={sortedSlots}
        keyExtractor={(item) => item.id}
        renderItem={renderSlotCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8b5cf6']}
            tintColor="#8b5cf6"
          />
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: '#6b7280' }}>
              لا توجد حصص في هذا اليوم
            </Text>
          </View>
        }
      />

      {/* Add Session Button - Fixed at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: '#f9fafb',
        }}
      >
        <Pressable
          onPress={handleOpenAddSession}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#8b5cf6',
            borderRadius: 12,
            paddingVertical: 16,
            gap: 8,
          }}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
            إضافة حصة جديدة
          </Text>
        </Pressable>
      </View>

      {/* Details Modal */}
      {renderDetailsModal()}

      {/* Edit Booking Modal */}
      <EditBookingModal
        visible={editBookingModalVisible}
        booking={selectedBooking}
        onClose={() => {
          closeAllModals();
          setSelectedBooking(null);
        }}
        onSave={handleSaveBooking}
      />

      {/* Add Booking Modal */}
      <AddBookingModal
        visible={addBookingModalVisible}
        sessionTitle={selectedSlot?.title || ''}
        capacity={selectedSlot?.capacity || 0}
        bookedBeds={selectedSlotBookings.map(b => b.bedNumber).filter((n): n is number => n !== undefined)}
        onClose={closeAllModals}
        onAdd={handleAddBookingSubmit}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        visible={editSessionModalVisible}
        session={selectedSlot}
        onClose={closeAllModals}
        onSave={handleSaveSession}
      />

      {/* Confirm Cancel Session Modal */}
      <ConfirmCancelSessionModal
        visible={cancelSessionModalVisible}
        sessionTitle={selectedSlot?.title || ''}
        onClose={closeAllModals}
        onConfirm={handleConfirmCancelSession}
      />

      {/* Confirm Delete Booking Modal */}
      <ConfirmDeleteBookingModal
        visible={deleteBookingModalVisible}
        customerName={selectedBooking?.customerName || ''}
        onClose={() => {
          closeAllModals();
          setSelectedBooking(null);
        }}
        onConfirm={handleConfirmDeleteBooking}
      />

      {/* Add Session Modal */}
      <AddSessionModal
        visible={addSessionModalVisible}
        onClose={closeAllModals}
        onSubmit={handleAddSessionSubmit}
      />
    </View>
  );
};

export default AdminScheduleScreen;

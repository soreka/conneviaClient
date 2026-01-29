// src/screens/Admin/AdminDashboardScreen.tsx
// Admin Dashboard - Summary stats, today's bookings, notifications
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import {
  CalendarDays,
  CalendarRange,
  CreditCard,
  Users,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Bed,
} from 'lucide-react-native';
import { Card } from '../../components/UI';
import {
  useAdminDashboardSummaryQuery,
  useAdminTodayBookingsQuery,
  useAdminNotificationsQuery,
  useUpdateBookingAttendanceMutation,
} from '../../features/api/apiSlice';

// ============================================
// Types matching backend response
// ============================================
interface DashboardStats {
  todayBookings: number;
  weekBookings: number;
  occupancyRateToday: number;
  pendingPayments: number;
  expiringMemberships: number;
}

interface TodayBooking {
  id: string;
  customerId: string | null;
  customerName: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  bedNumber: number;
  attendance: 'unknown' | 'attended' | 'absent';
}

interface Notification {
  id: string;
  type: 'booking_created' | 'booking_cancelled' | 'payment_pending' | 'membership_expiring';
  textAr: string;
  createdAt: string;
}

// ============================================
// Helper: Format time from ISO string
// ============================================
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ============================================
// Helper: Relative time in Arabic
// ============================================
function getRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return date.toLocaleDateString('ar-EG');
}

// ============================================
// Helper: Get today's date as YYYY-MM-DD
// ============================================
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// Notification type colors and icons
// ============================================
const NOTIFICATION_STYLES: Record<string, { color: string; bgColor: string }> = {
  booking_created: { color: '#22c55e', bgColor: '#dcfce7' },
  booking_cancelled: { color: '#ef4444', bgColor: '#fee2e2' },
  payment_pending: { color: '#f59e0b', bgColor: '#fef3c7' },
  membership_expiring: { color: '#8b5cf6', bgColor: '#f3e8ff' },
};

// ============================================
// Component: StatCard
// ============================================
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <View className="w-[48%] mb-3">
    <Card className="p-4">
      <View className="flex-row-reverse items-center justify-between">
        <View style={{ backgroundColor: color + '20' }} className="p-2 rounded-full">
          {icon}
        </View>
        <View className="flex-1 mr-3">
          <Text className="text-2xl font-bold text-foreground text-right">{value}</Text>
          <Text className="text-xs text-muted-foreground text-right">{label}</Text>
        </View>
      </View>
    </Card>
  </View>
);

// ============================================
// Component: BookingRow
// ============================================
interface BookingRowProps {
  booking: TodayBooking;
  onMarkAttended: () => void;
  onMarkAbsent: () => void;
  isUpdating: boolean;
}

const BookingRow: React.FC<BookingRowProps> = ({
  booking,
  onMarkAttended,
  onMarkAbsent,
  isUpdating,
}) => {
  const isAttended = booking.attendance === 'attended';
  const isAbsent = booking.attendance === 'absent';

  return (
    <View className="bg-card rounded-xl p-4 mb-3 border border-border">
      {/* Customer & Session Info */}
      <View className="flex-row-reverse items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground text-right">
            {booking.customerName}
          </Text>
          <Text className="text-sm text-muted-foreground text-right">{booking.sessionType}</Text>
        </View>
        <View className="flex-row items-center bg-muted px-2 py-1 rounded-lg">
          <Bed size={14} color="#8C8C8C" />
          <Text className="text-sm text-muted-foreground ml-1">سرير {booking.bedNumber}</Text>
        </View>
      </View>

      {/* Time */}
      <View className="flex-row-reverse items-center mb-3">
        <Clock size={14} color="#8C8C8C" />
        <Text className="text-sm text-muted-foreground mr-1">
          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
        </Text>
      </View>

      {/* Attendance Actions */}
      <View className="flex-row-reverse gap-2">
        <TouchableOpacity
          onPress={onMarkAttended}
          disabled={isUpdating || isAttended}
          className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${
            isAttended ? 'bg-green-500' : 'bg-green-100'
          }`}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={isAttended ? '#fff' : '#22c55e'} />
          ) : (
            <>
              <CheckCircle size={16} color={isAttended ? '#fff' : '#22c55e'} />
              <Text
                className={`text-sm font-medium mr-1 ${isAttended ? 'text-white' : 'text-green-600'}`}
              >
                حاضرة
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onMarkAbsent}
          disabled={isUpdating || isAbsent}
          className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${
            isAbsent ? 'bg-red-500' : 'bg-red-100'
          }`}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={isAbsent ? '#fff' : '#ef4444'} />
          ) : (
            <>
              <XCircle size={16} color={isAbsent ? '#fff' : '#ef4444'} />
              <Text className={`text-sm font-medium mr-1 ${isAbsent ? 'text-white' : 'text-red-600'}`}>
                لم تحضر
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// Component: NotificationItem
// ============================================
interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const style = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.booking_created;

  return (
    <View className="flex-row-reverse items-start py-3 border-b border-border">
      <View
        style={{ backgroundColor: style.bgColor }}
        className="w-2 h-2 rounded-full mt-2 ml-3"
      />
      <View className="flex-1">
        <Text className="text-sm text-foreground text-right">{notification.textAr}</Text>
        <Text className="text-xs text-muted-foreground text-right mt-1">
          {getRelativeTime(notification.createdAt)}
        </Text>
      </View>
    </View>
  );
};

// ============================================
// Main Component: AdminDashboardScreen
// ============================================
export const AdminDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const lastRefetchAt = useRef<number>(0);
  const REFETCH_DEBOUNCE_MS = 1000;

  const todayDate = getTodayDate();

  // RTK Query hooks
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useAdminDashboardSummaryQuery({ date: todayDate });

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    isFetching: bookingsFetching,
    refetch: refetchBookings,
  } = useAdminTodayBookingsQuery({ date: todayDate });

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    isFetching: notificationsFetching,
    refetch: refetchNotifications,
  } = useAdminNotificationsQuery({ limit: 20 });

  const [updateAttendance] = useUpdateBookingAttendanceMutation();

  // Guarded refetch function (Windsurf Gold Pattern)
  const asyncGuardedRefetch = useCallback(async () => {
    if (!isFocused) return;
    if (summaryFetching || bookingsFetching || notificationsFetching) return;

    const now = Date.now();
    if (now - lastRefetchAt.current < REFETCH_DEBOUNCE_MS) return;

    lastRefetchAt.current = now;
    await Promise.all([refetchSummary(), refetchBookings(), refetchNotifications()]);
  }, [
    isFocused,
    summaryFetching,
    bookingsFetching,
    notificationsFetching,
    refetchSummary,
    refetchBookings,
    refetchNotifications,
  ]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
    }, [asyncGuardedRefetch])
  );

  // AppState effect
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void asyncGuardedRefetch();
    });
    return () => sub.remove();
  }, [asyncGuardedRefetch]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await asyncGuardedRefetch();
    } finally {
      setRefreshing(false);
    }
  }, [asyncGuardedRefetch]);

  // Handle attendance update
  const handleMarkAttendance = useCallback(
    async (bookingId: string, attendance: 'attended' | 'absent') => {
      if (attendance === 'absent') {
        Alert.alert('تأكيد الغياب', 'هل أنتِ متأكدة من تسجيل غياب هذه العميلة؟', [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'تأكيد',
            style: 'destructive',
            onPress: async () => {
              setUpdatingBookingId(bookingId);
              try {
                await updateAttendance({ id: bookingId, attendance }).unwrap();
                refetchBookings();
              } catch (err: any) {
                Alert.alert('خطأ', err?.data?.error || 'فشل في تحديث الحضور');
              } finally {
                setUpdatingBookingId(null);
              }
            },
          },
        ]);
      } else {
        setUpdatingBookingId(bookingId);
        try {
          await updateAttendance({ id: bookingId, attendance }).unwrap();
          refetchBookings();
        } catch (err: any) {
          Alert.alert('خطأ', err?.data?.error || 'فشل في تحديث الحضور');
        } finally {
          setUpdatingBookingId(null);
        }
      }
    },
    [updateAttendance, refetchBookings]
  );

  const stats: DashboardStats = summaryData?.stats || {
    todayBookings: 0,
    weekBookings: 0,
    occupancyRateToday: 0,
    pendingPayments: 0,
    expiringMemberships: 0,
  };

  const bookings: TodayBooking[] = bookingsData?.bookings || [];
  const notifications: Notification[] = notificationsData?.notifications || [];

  const isLoading = summaryLoading || bookingsLoading || notificationsLoading;

  return (
    <View className="flex-1 bg-background">
      {/* Header with LinearGradient - iOS safe: no className on LinearGradient */}
      <View className="overflow-hidden">
        <LinearGradient
          colors={['#f5abd4', '#A68CD4']}
          start={{ x: 0.2, y: 0.4 }}
          end={{ x: 1, y: 1}}
          style={{ paddingTop: insets.top, paddingBottom: 20, paddingHorizontal: 16, flex: 0 }}
        >
          <Text className="text-2xl font-bold text-white text-right mt-4">لوحة التحكم</Text>
          <Text className="text-sm text-white/80 text-right mt-1">ملخّص اليوم والأسبوع</Text>
        </LinearGradient>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Grid */}
          <View className="flex-row flex-wrap justify-between">
            <StatCard
              icon={<CalendarDays size={20} color="#8b5cf6" />}
              label="حجوزات اليوم"
              value={stats.todayBookings}
              color="#8b5cf6"
            />
            <StatCard
              icon={<CalendarRange size={20} color="#3b82f6" />}
              label="حجوزات الأسبوع"
              value={stats.weekBookings}
              color="#3b82f6"
            />
            <StatCard
              icon={<CreditCard size={20} color="#f59e0b" />}
              label="مدفوعات معلقة"
              value={stats.pendingPayments}
              color="#f59e0b"
            />
            <StatCard
              icon={<Users size={20} color="#ef4444" />}
              label="اشتراكات تنتهي"
              value={stats.expiringMemberships}
              color="#ef4444"
            />
          </View>

          {/* Occupancy Rate */}
          <Card className="mb-4 p-4">
            <View className="flex-row-reverse items-center justify-between">
              <Text className="text-sm text-muted-foreground">نسبة الإشغال اليوم</Text>
              <Text className="text-2xl font-bold text-primary">{stats.occupancyRateToday}%</Text>
            </View>
            <View className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min(stats.occupancyRateToday, 100)}%` }}
              />
            </View>
          </Card>

          {/* Today's Bookings */}
          <View className="mb-4">
            <View className="flex-row-reverse items-center mb-3">
              <CalendarDays size={18} color="#8b5cf6" />
              <Text className="text-lg font-bold text-foreground mr-2">حجوزات اليوم</Text>
            </View>

            {bookings.length === 0 ? (
              <Card className="p-6">
                <Text className="text-center text-muted-foreground">لا توجد حجوزات اليوم</Text>
              </Card>
            ) : (
              bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onMarkAttended={() => handleMarkAttendance(booking.id, 'attended')}
                  onMarkAbsent={() => handleMarkAttendance(booking.id, 'absent')}
                  isUpdating={updatingBookingId === booking.id}
                />
              ))
            )}
          </View>

          {/* Notifications */}
          <View className="mb-4">
            <View className="flex-row-reverse items-center mb-3">
              <Bell size={18} color="#8b5cf6" />
              <Text className="text-lg font-bold text-foreground mr-2">آخر الإشعارات</Text>
            </View>

            <Card className="p-4">
              {notifications.length === 0 ? (
                <Text className="text-center text-muted-foreground py-4">لا توجد إشعارات</Text>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              )}
            </Card>
          </View>

        </ScrollView>
      )}
    </View>
  );
};

export default AdminDashboardScreen;

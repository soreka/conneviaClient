// src/screens/Booking/BookingWizardScreen.tsx
// Consumer Booking Wizard - 4 steps: Day → Session → Bed → Confirm
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, useIsFocused, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, Clock, Check } from 'lucide-react-native';
import {
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useCreateReservationMutation,
} from '../../features/api/apiSlice';

import {
  BookingHeader,
  DayCard,
  SessionCard,
  BedCard,
  BookingSummaryCard,
  CancellationPolicyCard,
} from './components';
import { BedIcon } from '../../components/icons/BedIcon';

// Temporary: Subscription check (hardcoded for now)
const hasActiveSubscription = true;

// ============================================
// TYPES
// ============================================

interface DayGroup {
  date: string; // YYYY-MM-DD
  displayDate: string; // Arabic formatted
  dayName: string;
  sessionsCount: number;
  hasAvailable: boolean;
}

interface SessionItem {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  bookedCount: number;
  availableSeats: number;
  instructorName?: string;
  locationName?: string;
  status: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getArabicDayName = (date: Date): string => {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[date.getDay()];
};

const formatArabicDate = (date: Date): string => {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getEndTime = (startsAt: string, durationMin: number): string => {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  return formatTime(end.toISOString());
};

const getTimeRange = (startsAt: string, durationMin: number): string => {
  return `${getEndTime(startsAt, durationMin)} - ${formatTime(startsAt)}`;
};

// ============================================
// NAVIGATION TYPES
// ============================================

export type BookingWizardParams = {
  startStep?: 1 | 2 | 3 | 4;
  preselectedDate?: string;
  preselectedSessionId?: string;
};

type BookingWizardRouteProp = RouteProp<{ BookingWizard: BookingWizardParams }, 'BookingWizard'>;

// ============================================
// MAIN COMPONENT
// ============================================

export const BookingWizardScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<BookingWizardRouteProp>();
  
  // Extract navigation params
  const { startStep, preselectedDate, preselectedSessionId } = route.params || {};
  
  // Track entry source for back behavior
  const entrySource = preselectedSessionId ? 'schedule' : 'main';
  
  // Wizard State - initialize from params
  const [step, setStep] = useState<number>(startStep || 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(preselectedDate || null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(preselectedSessionId || null);
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null);
  
  // Data Freshness - Guards
  const isFocused = useIsFocused();
  const lastRefetchAt = useRef<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const REFETCH_DEBOUNCE_MS = 1000;
  
  // API Queries
  const now = useMemo(() => new Date(), []);
  const twoWeeksLater = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 14);
    return d;
  }, [now]);
  
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isFetching: sessionsFetching,
    refetch: refetchSessions,
  } = useGetSessionsQuery({
    from: now.toISOString(),
    to: twoWeeksLater.toISOString(),
  });
  
  const {
    data: sessionDetailsData,
    isLoading: detailsLoading,
    isFetching: detailsFetching,
    refetch: refetchDetails,
  } = useGetSessionByIdQuery(selectedSessionId || '', {
    skip: !selectedSessionId,
  });
  
  const [createReservation, { isLoading: isCreating }] = useCreateReservationMutation();
  
  // Data Freshness - Async Guarded Refetch
  const asyncGuardedRefetch = useCallback(async () => {
    if (!isFocused) return;
    if (sessionsFetching) return;
    
    const now = Date.now();
    if (now - lastRefetchAt.current < REFETCH_DEBOUNCE_MS) return;
    
    lastRefetchAt.current = now;
    return refetchSessions();
  }, [refetchSessions, sessionsFetching, isFocused]);
  
  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
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
      await asyncGuardedRefetch();
    } finally {
      setRefreshing(false);
    }
  }, [asyncGuardedRefetch]);
  
  // Derived Data
  const sessions = sessionsData?.sessions || [];
  
  // Group sessions by date for Step 1
  const dayGroups: DayGroup[] = useMemo(() => {
    const groups = new Map<string, SessionItem[]>();
    
    // Generate 14 days from today
    const days: DayGroup[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      groups.set(dateKey, []);
      
      days.push({
        date: dateKey,
        displayDate: formatArabicDate(date),
        dayName: getArabicDayName(date),
        sessionsCount: 0,
        hasAvailable: false,
      });
    }
    
    // Populate with sessions
    sessions.forEach((session) => {
      const dateKey = formatDateKey(new Date(session.startsAt));
      const existing = groups.get(dateKey) || [];
      existing.push(session);
      groups.set(dateKey, existing);
    });
    
    // Update counts
    return days.map((day) => {
      const daySessions = groups.get(day.date) || [];
      return {
        ...day,
        sessionsCount: daySessions.length,
        hasAvailable: daySessions.some((s) => s.availableSeats > 0),
      };
    });
  }, [sessions, now]);
  
  // Sessions for selected date (Step 2)
  const sessionsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => formatDateKey(new Date(s.startsAt)) === selectedDate);
  }, [sessions, selectedDate]);
  
  // Selected session details
  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);
  
  // Selected day group
  const selectedDayGroup = useMemo(() => {
    return dayGroups.find(d => d.date === selectedDate) || null;
  }, [dayGroups, selectedDate]);
  
  // Bed grid data (Step 3)
  const bedData = useMemo(() => {
    if (!sessionDetailsData?.session) return { capacity: 0, bookedBeds: [] };
    const { capacity, bookedBeds } = sessionDetailsData.session;
    return { capacity, bookedBeds: bookedBeds || [] };
  }, [sessionDetailsData]);
  
  // Reset child selections when parent changes
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSessionId(null);
    setSelectedBedNumber(null);
  };
  
  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSelectedBedNumber(null);
  };
  
  // Navigation handlers
  const handleNext = () => {
    if (step === 1 && selectedDate) {
      setStep(2);
    } else if (step === 2 && selectedSessionId) {
      setStep(3);
    } else if (step === 3 && selectedBedNumber) {
      setStep(4);
    }
  };
  
  const handleBack = () => {
    // If entered from schedule deep-link and at Step 3, go back to schedule
    if (entrySource === 'schedule' && step === 3) {
      navigation.goBack();
      return;
    }
    
    // If entered from schedule and at Step 4, go back to Step 3
    if (entrySource === 'schedule' && step === 4) {
      setStep(3);
      return;
    }
    
    // Normal flow: go to previous step or exit
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };
  
  // Submit reservation
  const handleConfirmBooking = async () => {
    if (!selectedSessionId || !selectedBedNumber) return;
    
    try {
      await createReservation({
        sessionId: selectedSessionId,
        bedNumber: selectedBedNumber,
      }).unwrap();
      
      Alert.alert(
        'تم الحجز بنجاح! ✓',
        'تم تأكيد حجزك. يمكنك مراجعة حجوزاتك من صفحة حجوزاتي.',
        [
          {
            text: 'حسناً',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const message = error?.data?.error || 'حدث خطأ أثناء الحجز';
      Alert.alert('خطأ', message);
    }
  };
  
  // Can proceed to next step
  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedDate && dayGroups.find(d => d.date === selectedDate)?.sessionsCount! > 0;
      case 2: return !!selectedSessionId;
      case 3: return !!selectedBedNumber;
      case 4: return true;
      default: return false;
    }
  };
  
  // ============================================
  // RENDER STEP 1: Day Selection
  // ============================================
  const renderStep1 = () => (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#A68CD4']}
          tintColor="#A68CD4"
        />
      }
    >
      {/* Section Header */}
      <View className="flex-row justify-center items-center mb-5">
        <Text className="text-lg font-semibold text-foreground mr-2">
          اختاري اليوم
        </Text>
        <Calendar size={22} color="#8C8C8C" />
      </View>
      
      {sessionsLoading ? (
        <ActivityIndicator size="large" color="#A68CD4" className="mt-10" />
      ) : (
        <View className="flex-row flex-wrap justify-between">
          {dayGroups.map((day) => (
            <View key={day.date} className="w-[48%] mb-3">
              <DayCard
                dayName={day.dayName}
                dateLabel={day.displayDate}
                isSelected={selectedDate === day.date}
                isDisabled={day.sessionsCount === 0}
                onSelect={() => day.sessionsCount > 0 && handleDateSelect(day.date)}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
  
  // ============================================
  // RENDER STEP 2: Session Selection
  // ============================================
  const renderStep2 = () => (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#A68CD4']}
          tintColor="#A68CD4"
        />
      }
    >
      {/* Section Header */}
      <View className="flex-row justify-center items-center mb-4">
        <Text className="text-lg font-semibold text-foreground mr-2">
          اختاري الحصة
        </Text>
        <Clock size={22} color="#8C8C8C" />
      </View>
      
      {/* Selected Day Info Bar */}
      {selectedDayGroup && (
        <View className="flex-row justify-between items-center bg-secondary rounded-xl p-3.5 mb-4">
          <Text className="text-sm font-semibold text-foreground">
            {selectedDayGroup.dayName} - {selectedDayGroup.displayDate}
          </Text>
          <Text className="text-sm text-muted-foreground">
            اليوم المختار:
          </Text>
        </View>
      )}
      
      {sessionsForSelectedDate.length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-sm text-muted-foreground">
            لا توجد حصص في هذا اليوم
          </Text>
        </View>
      ) : (
        sessionsForSelectedDate.map((session) => (
          <SessionCard
            key={session.id}
            timeRange={getTimeRange(session.startsAt, session.durationMin)}
            sessionType={session.title}
            instructorName={session.instructorName || 'المدربة'}
            availableSeats={session.availableSeats}
            capacity={session.capacity}
            isSelected={selectedSessionId === session.id}
            isFull={session.availableSeats <= 0}
            onSelect={() => handleSessionSelect(session.id)}
          />
        ))
      )}
    </ScrollView>
  );
  
  // ============================================
  // RENDER STEP 3: Bed Selection
  // ============================================
  const renderStep3 = () => (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      {/* Section Header */}
      <View className="flex-row justify-center items-center mb-4">
        <Text className="text-lg font-semibold text-foreground mr-2">
          اختاري السرير
        </Text>
        <BedIcon size={28} />
      </View>
      
      {detailsLoading ? (
        <ActivityIndicator size="large" color="#A68CD4" className="mt-10" />
      ) : (
        <>
          {/* Bed Grid */}
          <View className="flex-row flex-wrap justify-center">
            {Array.from({ length: bedData.capacity }, (_, i) => i + 1).map((bedNum) => (
              <BedCard
                key={bedNum}
                bedNumber={bedNum}
                isBooked={bedData.bookedBeds.includes(bedNum)}
                isSelected={selectedBedNumber === bedNum}
                onSelect={() => setSelectedBedNumber(bedNum)}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
  
  // ============================================
  // RENDER STEP 4: Confirmation
  // ============================================
  const renderStep4 = () => (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      {/* Confirmation Header */}
      <View className="flex-row justify-center items-center mb-5">
        <Text className="text-lg font-semibold text-foreground mr-2">
          تأكيد الحجز
        </Text>
        <Check size={22} color="#22C55E" />
      </View>
      
      {/* Booking Summary Card */}
      {selectedSession && selectedDayGroup && selectedBedNumber && (
        <BookingSummaryCard
          dayName={selectedDayGroup.dayName}
          dateLabel={selectedDayGroup.displayDate}
          timeRange={getTimeRange(selectedSession.startsAt, selectedSession.durationMin)}
          sessionType={selectedSession.title}
          instructorName={selectedSession.instructorName || 'المدربة'}
          bedNumber={selectedBedNumber}
        />
      )}
      
      {/* Cancellation Policy */}
      <CancellationPolicyCard />
    </ScrollView>
  );
  
  // Render Step Content
  const renderStepContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };
  
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <BookingHeader
        step={step}
        totalSteps={4}
        onBack={handleBack}
      />
      
      {/* Step Content */}
      <View className="flex-1">
        {renderStepContent()}
      </View>
      
      {/* Bottom Button */}
      <View className="p-4 pb-6 bg-white">
        {step === 4 ? (
          <>
            <Pressable
              onPress={handleConfirmBooking}
              disabled={isCreating}
              className={`rounded-2xl py-4 items-center mb-3 ${isCreating ? 'bg-muted' : 'bg-primary'}`}
              style={{
                shadowColor: '#A68CD4',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {isCreating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">
                  تأكيد الحجز الآن
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleBack}
              className="bg-white rounded-2xl py-3.5 items-center border border-border"
            >
              <Text className="text-sm font-semibold text-muted-foreground">
                العودة للتعديل
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleNext}
            disabled={!canProceed()}
            className={`rounded-2xl py-4 items-center ${canProceed() ? 'bg-primary' : 'bg-muted'}`}
            style={{
              shadowColor: canProceed() ? '#A68CD4' : 'transparent',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: canProceed() ? 4 : 0,
            }}
          >
            <Text className={`text-base font-bold ${canProceed() ? 'text-white' : 'text-muted-foreground'}`}>
              التالي
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
};

export default BookingWizardScreen;

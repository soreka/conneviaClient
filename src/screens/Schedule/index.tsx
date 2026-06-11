import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useGetSessionsQuery } from '../../features/api/apiSlice';
import { Screen } from '../../components/UI';
import { ScheduleHeader } from './ScheduleHeader';
import { WeekDayTabs, type DayItem } from '../../components/schedule/WeekDayTabs';
import { DayInfoCard } from './DayInfoCard';
import { SessionCard } from './SessionCard';
import {
  getStartOfWeek,
  getWeekDays,
  getEndOfWeek,
  formatArabicDayName,
  isSameDay,
} from '../../utils/dates';

type ScheduleStackParamList = {
  ScheduleList: undefined;
  BookingWizard: {
    startStep?: 1 | 2 | 3 | 4;
    preselectedDate?: string;
    preselectedSessionId?: string;
  };
};

type NavigationProp = NativeStackNavigationProp<ScheduleStackParamList, 'ScheduleList'>;

interface Session {
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

export const ScheduleScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const today = useMemo(() => new Date(), []);

  // Bounded week navigation: 0 = current week, 1 = next week. Matches the
  // booking wizard's 14-day generation horizon (SCHED-NAV-01). No past weeks,
  // no week +2.
  const MAX_WEEK_OFFSET = 1;
  const [weekOffset, setWeekOffset] = useState(0);

  // Anchor on the current week's start, then shift +7 days per offset. This
  // mirrors `getStartOfWeek(today, 0)` + `setDate(+7)` so the query window is
  // byte-for-byte the explicit current/next-week range.
  const baseStartOfWeek = useMemo(() => getStartOfWeek(today, 0), [today]);
  const startOfWeek = useMemo(() => {
    const d = new Date(baseStartOfWeek);
    d.setDate(baseStartOfWeek.getDate() + 7 * weekOffset);
    return d;
  }, [baseStartOfWeek, weekOffset]);
  const endOfWeek = useMemo(() => getEndOfWeek(startOfWeek), [startOfWeek]);
  const weekDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);

  const todayIndex = useMemo(() => {
    const index = weekDays.findIndex((day) => isSameDay(day, today));
    return index >= 0 ? index : 0;
  }, [weekDays, today]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);

  // Switching weeks resets the selected day: today's index on the current
  // week, the first day on next week (today isn't in next week's range).
  const goToWeek = (offset: number) => {
    const clamped = Math.max(0, Math.min(MAX_WEEK_OFFSET, offset));
    if (clamped === weekOffset) return;
    setWeekOffset(clamped);
    setSelectedDayIndex(clamped === 0 ? todayIndex : 0);
  };

  const { data, isLoading, error, refetch, isFetching } = useGetSessionsQuery({
    from: startOfWeek.toISOString(),
    to: endOfWeek.toISOString(),
  });

  const sessions = data?.sessions || [];

  const daysWithSessions = useMemo((): DayItem[] => {
    return weekDays.map((date) => {
      const hasSessions = sessions.some((session) =>
        isSameDay(new Date(session.startsAt), date)
      );
      return {
        date,
        name: formatArabicDayName(date),
        enabled: hasSessions || true, // Enable all days for navigation
      };
    });
  }, [weekDays, sessions]);

  const selectedDate = weekDays[selectedDayIndex];

  const filteredSessions = useMemo(() => {
    // Filter sessions for selected day and sort by start time (chronological)
    return sessions
      .filter((session) => isSameDay(new Date(session.startsAt), selectedDate))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [sessions, selectedDate]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Navigate directly to BookingWizard at Step 3 with preselected session
  const handleSessionPress = (sessionId: string, sessionDate: string) => {
    navigation.navigate('BookingWizard', { 
      startStep: 3, 
      preselectedSessionId: sessionId,
      preselectedDate: sessionDate.split('T')[0],
    });
  };

  const handleBookPress = (sessionId: string, sessionDate: string) => {
    navigation.navigate('BookingWizard', { 
      startStep: 3, 
      preselectedSessionId: sessionId,
      preselectedDate: sessionDate.split('T')[0],
    });
  };

  const renderSessionCard = ({ item }: { item: Session }) => (
    <SessionCard
      session={item}
      onPress={() => handleSessionPress(item.id, item.startsAt)}
      onBookPress={() => handleBookPress(item.id, item.startsAt)}
    />
  );

  const renderEmptyState = () => (
    <View className="py-12 px-4">
      <Text className="text-center text-muted-foreground text-base">
        لا توجد حصص متاحة في هذا اليوم
      </Text>
    </View>
  );

  const renderListHeader = () => <DayInfoCard selectedDate={selectedDate} />;

  // Bounded week navigation controls. RTL: "next" points left, "back" right.
  // The back-to-current control only exists once on next week; the next-week
  // control only exists on the current week — keeping the offset clamped 0..1.
  const renderWeekNav = () => (
    <View
      className="bg-white px-4 pt-3"
      style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ width: 44, alignItems: 'flex-start' }}>
        {weekOffset > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الأسبوع الحالي"
            onPress={() => goToWeek(weekOffset - 1)}
            hitSlop={8}
            className="w-11 h-11 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            <ChevronRight size={22} color="#8b5cf6" />
          </Pressable>
        )}
      </View>

      <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>
        {weekOffset === 0 ? 'هذا الأسبوع' : 'الأسبوع القادم'}
      </Text>

      <View style={{ width: 44, alignItems: 'flex-end' }}>
        {weekOffset < MAX_WEEK_OFFSET && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الأسبوع القادم"
            onPress={() => goToWeek(weekOffset + 1)}
            hitSlop={8}
            className="w-11 h-11 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            <ChevronLeft size={22} color="#8b5cf6" />
          </Pressable>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <ScheduleHeader onBackPress={handleBackPress} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#A68CD4" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ScheduleHeader onBackPress={handleBackPress} />
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-destructive text-center text-base">
            فشل في تحميل الجدول. يرجى المحاولة مرة أخرى.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScheduleHeader onBackPress={handleBackPress} />

      {renderWeekNav()}

      <WeekDayTabs
        days={daysWithSessions}
        selectedIndex={selectedDayIndex}
        onSelectDay={setSelectedDayIndex}
      />

      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSessionCard}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor="#A68CD4"
            colors={['#A68CD4']}
          />
        }
      />
    </View>
  );
};

export default ScheduleScreen;

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  const startOfWeek = useMemo(() => getStartOfWeek(today, 0), [today]);
  const endOfWeek = useMemo(() => getEndOfWeek(startOfWeek), [startOfWeek]);
  const weekDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);

  const todayIndex = useMemo(() => {
    const index = weekDays.findIndex((day) => isSameDay(day, today));
    return index >= 0 ? index : 0;
  }, [weekDays, today]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);

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

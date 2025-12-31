// src/screens/AdminScheduleSettings/AdminScheduleSettingsScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Animated, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { RefreshCw } from 'lucide-react-native';
import {
  useGetAdminScheduleSettingsQuery,
  useUpdateAdminScheduleSettingsMutation,
  useGenerateAdminSessionsMutation,
} from '../../features/api/apiSlice';
import { DaySettings } from '../../types/scheduleSettings';
import {
  AdminScheduleHeader,
  DaySettingsCard,
  DayHoursModal,
  AutoGenerateSection,
  ScheduleSettingsSkeleton,
} from './components';

export const AdminScheduleSettingsScreen = () => {
  const navigation = useNavigation();

  // Local state
  const [localDays, setLocalDays] = useState<DaySettings[]>([]);
  const [selectedDay, setSelectedDay] = useState<DaySettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Animation refs for day cards
  const dayAnims = useRef<Animated.Value[]>([]);

  // RTK Query hooks
  const {
    data: settingsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetAdminScheduleSettingsQuery();

  const [updateSettings, { isLoading: isSaving }] = useUpdateAdminScheduleSettingsMutation();
  const [generateSessions, { isLoading: isGenerating }] = useGenerateAdminSessionsMutation();

  // Initialize animations
  useEffect(() => {
    if (dayAnims.current.length === 0) {
      dayAnims.current = [0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0));
    }
  }, []);

  // Sync server data to local state
  useEffect(() => {
    if (settingsData?.days) {
      setLocalDays(settingsData.days);

      // Play staggered entry animation
      Animated.stagger(
        60,
        dayAnims.current.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [settingsData]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Toggle day enabled (optimistic update + persist)
  const handleToggleDay = async (dayOfWeek: number, enabled: boolean) => {
    // Optimistic update
    const newDays = localDays.map((d) =>
      d.dayOfWeek === dayOfWeek ? { ...d, enabled } : d
    );
    setLocalDays(newDays);

    try {
      await updateSettings({ days: newDays }).unwrap();
      Toast.show({
        type: 'success',
        text1: 'تم حفظ الإعدادات',
        position: 'bottom',
      });
    } catch (err) {
      // Rollback
      setLocalDays(localDays);
      Toast.show({
        type: 'error',
        text1: 'خطأ في حفظ الإعدادات',
        position: 'bottom',
      });
    }
  };

  // Open day hours modal
  const handleDayPress = (day: DaySettings) => {
    if (day.enabled) {
      setSelectedDay(day);
    } else {
      Toast.show({
        type: 'info',
        text1: 'قم بتفعيل اليوم أولاً',
        position: 'bottom',
      });
    }
  };

  // Save day settings from modal
  const handleSaveDay = async (updatedDay: DaySettings) => {
    const newDays = localDays.map((d) =>
      d.dayOfWeek === updatedDay.dayOfWeek ? updatedDay : d
    );
    setLocalDays(newDays);

    try {
      await updateSettings({ days: newDays }).unwrap();
      setSelectedDay(null);
      
      if (updatedDay.workPeriods.length > localDays.find(d => d.dayOfWeek === updatedDay.dayOfWeek)?.workPeriods.length!) {
        Toast.show({
          type: 'success',
          text1: 'تمت إضافة فترة العمل',
          position: 'bottom',
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'تم حفظ الإعدادات',
          position: 'bottom',
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'خطأ في حفظ الإعدادات',
        position: 'bottom',
      });
    }
  };

  // Generate sessions
  const handleGenerate = async (durationMinutes: number, selectedDays: number[], startDate?: string) => {
    try {
      const result = await generateSessions({
        durationMinutes,
        dayOfWeeks: selectedDays,
        range: { 
          weeks: 1,
          ...(startDate && { startDate }),
        },
      }).unwrap();

      if (result.created > 0) {
        Toast.show({
          type: 'success',
          text1: 'تم إنشاء الحصص بنجاح',
          text2: `تم إنشاء ${result.created} حصة${result.skipped > 0 ? ` (${result.skipped} موجودة مسبقاً)` : ''}`,
          position: 'bottom',
        });
      } else if (result.skipped > 0) {
        Toast.show({
          type: 'info',
          text1: 'جميع الحصص موجودة مسبقاً',
          text2: `${result.skipped} حصة موجودة`,
          position: 'bottom',
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'خطأ في إنشاء الحصص',
        position: 'bottom',
      });
    }
  };

  // Error retry
  const ErrorRetry: React.FC = () => (
    <View className="flex-1 items-center justify-center p-5">
      <TouchableOpacity
        onPress={() => refetch()}
        className="flex-row items-center bg-red-50 px-6 py-3 rounded-xl"
        activeOpacity={0.7}
      >
        <Text className="text-red-600 font-medium ml-2">تعذر تحميل الإعدادات</Text>
        <RefreshCw size={18} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <AdminScheduleHeader onBackPress={() => navigation.goBack()} />

      {/* Content */}
      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScheduleSettingsSkeleton />
        </ScrollView>
      ) : error ? (
        <ErrorRetry />
      ) : (
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
          {/* Days list */}
          <View className="pt-4">
            {localDays.map((day, index) => (
              <DaySettingsCard
                key={day.dayOfWeek}
                day={day}
                onToggleEnabled={(enabled) => handleToggleDay(day.dayOfWeek, enabled)}
                onPress={() => handleDayPress(day)}
                animValue={dayAnims.current[index]}
              />
            ))}
          </View>

          {/* Auto generate section */}
          <AutoGenerateSection
            days={localDays}
            onGenerate={handleGenerate}
            generating={isGenerating}
          />

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      )}

      {/* Day hours modal */}
      <DayHoursModal
        visible={!!selectedDay}
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        onSave={handleSaveDay}
        saving={isSaving}
      />
    </View>
  );
};

export default AdminScheduleSettingsScreen;

/*
 * TEST CHECKLIST:
 * 1) Load screen -> settings fetched -> days rendered with correct Arabic names
 * 2) Disable a day -> persists -> reopen app -> remains disabled
 * 3) Add 2 periods -> persists -> reload -> present
 * 4) Prevent overlapping periods -> shows error toast "هذه الفترة تتداخل مع فترة موجودة"
 * 5) Auto generate with 60 min for 2 days -> returns created >0 -> toast shows count
 * 6) Generate again same params -> created=0 skipped>0 (no duplicates) -> toast shows "موجودة مسبقاً"
 * 7) All controls RTL and no forced RTL calls inside components (no I18nManager.forceRTL)
 * 8) Pull-to-refresh works correctly
 * 9) Skeleton loading visible on initial load
 * 10) Day cards have staggered entry animation
 * 11) Modal fade-in animation works
 * 12) Back button navigates correctly (navigation.goBack())
 */

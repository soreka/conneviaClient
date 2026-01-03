// src/screens/AdminScheduleSettings/components/AutoGenerateSection.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Zap, CheckCircle, Calendar, Lock, Users } from 'lucide-react-native';
import { Checkbox } from '../../../components/UI/Checkbox';
import { DaySettings, ARABIC_DAY_NAMES, DURATION_PRESETS } from '../../../types/scheduleSettings';

type WeekOption = 'current' | 'next';

// Bed count presets
const BED_COUNT_PRESETS = [2, 3, 4, 5, 6, 8];

interface AutoGenerateSectionProps {
  days: DaySettings[];
  onGenerate: (durationMinutes: number, selectedDays: number[], startDate?: string, capacity?: number) => Promise<void>;
  generating?: boolean;
}

// Helper: Get the start of next week (Sunday)
const getNextWeekStart = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sunday
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilNextSunday);
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday;
};

// Helper: Format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const AutoGenerateSection: React.FC<AutoGenerateSectionProps> = ({
  days,
  onGenerate,
  generating = false,
}) => {
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [weekOption, setWeekOption] = useState<WeekOption>('current');
  const [bedCount, setBedCount] = useState(4);

  const enabledDays = days.filter((d) => d.enabled && d.workPeriods.length > 0);

  // Calculate which days are in the past (for current week only)
  const pastDays = useMemo(() => {
    if (weekOption === 'next') return new Set<number>();
    
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
    
    // Days before today in the current week are past
    const past = new Set<number>();
    for (let i = 0; i < currentDayOfWeek; i++) {
      past.add(i);
    }
    return past;
  }, [weekOption]);

  // Days that can be selected (enabled + have periods + not in past for current week)
  const selectableDays = useMemo(() => {
    return enabledDays.filter((d) => !pastDays.has(d.dayOfWeek));
  }, [enabledDays, pastDays]);

  // Check if today is selected (for showing "upcoming hours only" message)
  const todaySelected = useMemo(() => {
    if (weekOption === 'next') return false;
    const todayDayOfWeek = new Date().getDay();
    return selectedDays.includes(todayDayOfWeek);
  }, [weekOption, selectedDays]);

  // Get current hour for the message
  const currentHour = useMemo(() => {
    const now = new Date();
    return now.getHours();
  }, []);

  const handleDurationSelect = (value: number) => {
    setSelectedDuration(value);
    setDurationError(null);
  };

  const handleCustomDurationChange = (text: string) => {
    setCustomDuration(text);
    const num = parseInt(text, 10);
    if (text && (isNaN(num) || num < 15 || num > 180)) {
      setDurationError('المدة يجب أن تكون بين 15 و 180 دقيقة');
    } else {
      setDurationError(null);
    }
  };

  const toggleDay = (dayOfWeek: number) => {
    // Don't allow selecting past days
    if (pastDays.has(dayOfWeek)) return;
    
    setSelectedDays((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((d) => d !== dayOfWeek)
        : [...prev, dayOfWeek]
    );
  };

  const selectAllEnabled = () => {
    // Only select days that are selectable (not past)
    setSelectedDays(selectableDays.map((d) => d.dayOfWeek));
  };

  // Handle week option change - clear selected days that become invalid
  const handleWeekOptionChange = (option: WeekOption) => {
    setWeekOption(option);
    // Clear any selected days that would be past in the new week option
    if (option === 'current') {
      const today = new Date();
      const currentDayOfWeek = today.getDay();
      setSelectedDays((prev) => prev.filter((d) => d >= currentDayOfWeek));
    }
  };

  const handleGenerate = async () => {
    let duration = selectedDuration;
    if (selectedDuration === 0) {
      const num = parseInt(customDuration, 10);
      if (isNaN(num) || num < 15 || num > 180) {
        setDurationError('المدة يجب أن تكون بين 15 و 180 دقيقة');
        return;
      }
      duration = num;
    }

    if (selectedDays.length === 0) {
      return;
    }

    // Calculate startDate based on week option
    const startDate = weekOption === 'next' ? formatDate(getNextWeekStart()) : undefined;
    await onGenerate(duration, selectedDays, startDate, bedCount);
  };

  const isCustom = selectedDuration === 0;
  const canGenerate =
    selectedDays.length > 0 &&
    (isCustom ? customDuration && !durationError : true) &&
    !generating;

  return (
    <View
      className="bg-white rounded-2xl mx-5 mt-4 p-4"
      style={{
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row-reverse items-center justify-end mb-4">
        <Text className="text-lg font-bold text-gray-900 mr-2">إنشاء الحصص تلقائياً</Text>
        <Zap size={20} color="#8b5cf6" />
      </View>

      {/* Week selection toggle */}
      <Text className="text-sm font-semibold text-gray-700 mb-2 text-right">
        الأسبوع
      </Text>
      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity
          onPress={() => handleWeekOptionChange('next')}
          className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-xl ${
            weekOption === 'next'
              ? 'bg-purple-600'
              : 'bg-gray-100'
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`font-medium ${
              weekOption === 'next' ? 'text-white' : 'text-gray-700'
            }`}
          >
            الأسبوع القادم
          </Text>
          <Calendar size={16} color={weekOption === 'next' ? '#FFFFFF' : '#6B7280'} style={{ marginRight: 6 }} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleWeekOptionChange('current')}
          className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-xl ${
            weekOption === 'current'
              ? 'bg-purple-600'
              : 'bg-gray-100'
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`font-medium ${
              weekOption === 'current' ? 'text-white' : 'text-gray-700'
            }`}
          >
            الأسبوع الحالي
          </Text>
          <Calendar size={16} color={weekOption === 'current' ? '#FFFFFF' : '#6B7280'} style={{ marginRight: 6 }} />
        </TouchableOpacity>
      </View>

      {/* Duration selection */}
      <Text className="text-sm font-semibold text-gray-700 mb-2 text-right">
        مدة الحصة
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-3">
        {DURATION_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.value}
            onPress={() => handleDurationSelect(preset.value)}
            className={`px-4 py-2 rounded-lg ${
              selectedDuration === preset.value
                ? 'bg-purple-600'
                : 'bg-gray-100'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`font-medium ${
                selectedDuration === preset.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom duration input */}
      {isCustom && (
        <View className="mb-3">
          <TextInput
            value={customDuration}
            onChangeText={handleCustomDurationChange}
            placeholder="أدخل المدة بالدقائق"
            keyboardType="number-pad"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-right"
            placeholderTextColor="#9CA3AF"
          />
          {durationError && (
            <Text className="text-red-500 text-xs mt-1 text-right">{durationError}</Text>
          )}
        </View>
      )}

      {/* Bed count selection */}
      <View className="flex-row items-center justify-end mb-2">
        <Text className="text-sm font-semibold text-gray-700">عدد الأسرّة</Text>
        <Users size={16} color="#6B7280" style={{ marginLeft: 6 }} />
      </View>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {BED_COUNT_PRESETS.map((count) => (
          <TouchableOpacity
            key={count}
            onPress={() => setBedCount(count)}
            className={`px-4 py-2 rounded-lg ${
              bedCount === count
                ? 'bg-purple-600'
                : 'bg-gray-100'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`font-medium ${
                bedCount === count ? 'text-white' : 'text-gray-700'
              }`}
            >
              {count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Day selection */}
      <View className="flex-row items-center justify-between mb-2">
        <TouchableOpacity onPress={selectAllEnabled} activeOpacity={0.7}>
          <Text className="text-purple-600 text-sm font-medium">تحديد جميع الأيام المفعلة</Text>
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-gray-700">اختر الأيام</Text>
      </View>

      {enabledDays.length === 0 ? (
        <View className="bg-amber-50 rounded-xl p-3 mb-4">
          <Text className="text-amber-700 text-sm text-center">
            لا توجد أيام مفعلة مع فترات عمل. قم بإضافة فترات عمل أولاً.
          </Text>
        </View>
      ) : selectableDays.length === 0 && weekOption === 'current' ? (
        <View className="bg-amber-50 rounded-xl p-3 mb-4">
          <Text className="text-amber-700 text-sm text-center">
            جميع أيام الأسبوع الحالي قد مضت. اختر الأسبوع القادم لإنشاء الحصص.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2 mb-4">
          {enabledDays.map((day) => {
            const isPast = pastDays.has(day.dayOfWeek);
            const isSelected = selectedDays.includes(day.dayOfWeek);
            
            return (
              <TouchableOpacity
                key={day.dayOfWeek}
                onPress={() => toggleDay(day.dayOfWeek)}
                disabled={isPast}
                className={`flex-row items-center px-3 py-2 rounded-lg ${
                  isPast
                    ? 'bg-gray-100 border border-gray-200 opacity-50'
                    : isSelected
                    ? 'bg-purple-100 border border-purple-300'
                    : 'bg-gray-50 border border-gray-200'
                }`}
                activeOpacity={isPast ? 1 : 0.7}
              >
                {isPast ? (
                  <Lock size={14} color="#9CA3AF" />
                ) : isSelected ? (
                  <CheckCircle size={14} color="#8b5cf6" />
                ) : null}
                <Text
                  className={`font-medium mr-1 ${
                    isPast
                      ? 'text-gray-400'
                      : isSelected
                      ? 'text-purple-700'
                      : 'text-gray-700'
                  }`}
                >
                  {ARABIC_DAY_NAMES[day.dayOfWeek]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Past days warning */}
      {weekOption === 'current' && pastDays.size > 0 && selectableDays.length > 0 && (
        <View className="bg-gray-50 rounded-xl p-2 mb-3 flex-row items-center justify-end">
          <Text className="text-gray-500 text-xs mr-1">
            الأيام المقفلة قد مضت ولا يمكن إنشاء حصص لها
          </Text>
          <Lock size={12} color="#9CA3AF" />
        </View>
      )}

      {/* Today selected - upcoming hours only message */}
      {todaySelected && currentHour > 0 && (
        <View className="bg-blue-50 rounded-xl p-3 mb-3 flex-row items-center justify-end">
          <Text className="text-blue-700 text-xs text-right flex-1">
            اليوم محدد: الحصص التي مضى وقتها لن يتم إنشاؤها، فقط الحصص القادمة سيتم إنشاؤها
          </Text>
          <Calendar size={14} color="#1D4ED8" style={{ marginLeft: 8 }} />
        </View>
      )}

      {/* Generate button */}
      <TouchableOpacity
        onPress={handleGenerate}
        disabled={!canGenerate}
        className={`py-4 rounded-xl flex-row items-center justify-center ${
          canGenerate ? 'bg-purple-600' : 'bg-gray-300'
        }`}
        activeOpacity={0.8}
      >
        {generating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text className="text-white font-bold text-base ml-2">إنشاء الحصص</Text>
            <Zap size={18} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

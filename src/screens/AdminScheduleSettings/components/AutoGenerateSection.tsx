// src/screens/AdminScheduleSettings/components/AutoGenerateSection.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Zap, CheckCircle } from 'lucide-react-native';
import { Checkbox } from '../../../components/UI/Checkbox';
import { DaySettings, ARABIC_DAY_NAMES, DURATION_PRESETS } from '../../../types/scheduleSettings';

interface AutoGenerateSectionProps {
  days: DaySettings[];
  onGenerate: (durationMinutes: number, selectedDays: number[]) => Promise<void>;
  generating?: boolean;
}

export const AutoGenerateSection: React.FC<AutoGenerateSectionProps> = ({
  days,
  onGenerate,
  generating = false,
}) => {
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [durationError, setDurationError] = useState<string | null>(null);

  const enabledDays = days.filter((d) => d.enabled && d.workPeriods.length > 0);

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
    setSelectedDays((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((d) => d !== dayOfWeek)
        : [...prev, dayOfWeek]
    );
  };

  const selectAllEnabled = () => {
    setSelectedDays(enabledDays.map((d) => d.dayOfWeek));
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

    await onGenerate(duration, selectedDays);
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
      ) : (
        <View className="flex-row flex-wrap gap-2 mb-4">
          {enabledDays.map((day) => (
            <TouchableOpacity
              key={day.dayOfWeek}
              onPress={() => toggleDay(day.dayOfWeek)}
              className={`flex-row items-center px-3 py-2 rounded-lg ${
                selectedDays.includes(day.dayOfWeek)
                  ? 'bg-purple-100 border border-purple-300'
                  : 'bg-gray-50 border border-gray-200'
              }`}
              activeOpacity={0.7}
            >
              {selectedDays.includes(day.dayOfWeek) && (
                <CheckCircle size={14} color="#8b5cf6" />
              )}
              <Text
                className={`font-medium mr-1 ${
                  selectedDays.includes(day.dayOfWeek)
                    ? 'text-purple-700'
                    : 'text-gray-700'
                }`}
              >
                {ARABIC_DAY_NAMES[day.dayOfWeek]}
              </Text>
            </TouchableOpacity>
          ))}
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

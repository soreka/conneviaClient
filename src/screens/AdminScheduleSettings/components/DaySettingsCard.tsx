// src/screens/AdminScheduleSettings/components/DaySettingsCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { Switch } from '../../../components/UI/Switch';
import { DaySettings, ARABIC_DAY_NAMES } from '../../../types/scheduleSettings';

interface DaySettingsCardProps {
  day: DaySettings;
  onToggleEnabled: (enabled: boolean) => void;
  onPress: () => void;
  animValue?: Animated.Value;
}

export const DaySettingsCard: React.FC<DaySettingsCardProps> = ({
  day,
  onToggleEnabled,
  onPress,
  animValue,
}) => {
  const dayName = ARABIC_DAY_NAMES[day.dayOfWeek];
  const periodsCount = day.workPeriods.length;

  const animatedStyle = animValue
    ? {
        opacity: animValue,
        transform: [
          {
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }
    : {};

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`bg-white rounded-2xl p-4 mb-3 mx-5 ${
          day.enabled ? '' : 'opacity-60'
        }`}
        style={{
          borderWidth: 1,
          borderColor: day.enabled ? '#E5E7EB' : '#F3F4F6',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Top row: Day name and Switch */}
        <View className="flex-row items-center justify-between mb-2">
          <Switch
            value={day.enabled}
            onValueChange={onToggleEnabled}
            size="sm"
          />
          <Text className="text-lg font-bold text-gray-900">{dayName}</Text>
        </View>

        {/* Bottom row: Periods count and arrow */}
        <View className="flex-row items-center justify-between">
          <ChevronLeft size={18} color="#9CA3AF" />
          <View className="flex-row-reverse items-center">
            <Clock size={14} color="#9CA3AF" />
            <Text className="text-sm text-gray-500 mr-1">
              {periodsCount === 0
                ? 'لا توجد فترات عمل'
                : `${periodsCount} فترات عمل`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

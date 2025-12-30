// src/screens/AdminScheduleSettings/components/WorkPeriodCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Trash2, Clock } from 'lucide-react-native';
import { WorkPeriod } from '../../../types/scheduleSettings';

interface WorkPeriodCardProps {
  period: WorkPeriod;
  onDelete: () => void;
}

// Format HH:mm to Arabic display
const formatDisplayTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const WorkPeriodCard: React.FC<WorkPeriodCardProps> = ({
  period,
  onDelete,
}) => {
  return (
    <View
      className="bg-gray-50 rounded-xl p-3 mb-2 flex-row items-center justify-between"
      style={{
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}
    >
      <TouchableOpacity
        onPress={onDelete}
        className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
        activeOpacity={0.7}
      >
        <Trash2 size={16} color="#EF4444" />
      </TouchableOpacity>

      <View className="flex-row-reverse items-center flex-1 mr-3">
        <Clock size={16} color="#6B7280" />
        <Text className="text-base text-gray-800 mr-2">
          {formatDisplayTime(period.startTime)} - {formatDisplayTime(period.endTime)}
        </Text>
      </View>
    </View>
  );
};

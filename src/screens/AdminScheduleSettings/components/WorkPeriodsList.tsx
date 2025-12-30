// src/screens/AdminScheduleSettings/components/WorkPeriodsList.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { WorkPeriod } from '../../../types/scheduleSettings';
import { WorkPeriodCard } from './WorkPeriodCard';

interface WorkPeriodsListProps {
  periods: WorkPeriod[];
  onDeletePeriod: (periodId: string) => void;
  onAddPeriod: () => void;
}

export const WorkPeriodsList: React.FC<WorkPeriodsListProps> = ({
  periods,
  onDeletePeriod,
  onAddPeriod,
}) => {
  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity
          onPress={onAddPeriod}
          className="flex-row items-center"
          activeOpacity={0.7}
        >
          <Text className="text-purple-600 font-medium ml-1">إضافة فترة</Text>
          <Plus size={18} color="#8b5cf6" />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-800">فترات العمل</Text>
      </View>

      {periods.length === 0 ? (
        <View className="bg-gray-50 rounded-xl p-4 items-center">
          <Text className="text-gray-500 text-center">
            لا توجد فترات عمل محددة لهذا اليوم
          </Text>
        </View>
      ) : (
        periods.map((period) => (
          <WorkPeriodCard
            key={period.id}
            period={period}
            onDelete={() => onDeletePeriod(period.id)}
          />
        ))
      )}
    </View>
  );
};

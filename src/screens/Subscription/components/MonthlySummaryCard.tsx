// src/screens/Subscription/components/MonthlySummaryCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Calendar, CheckCircle } from 'lucide-react-native';

interface MonthlySummaryCardProps {
  attendedSessionsThisMonth: number;
  totalSessionsThisMonth?: number;
}

export const MonthlySummaryCard: React.FC<MonthlySummaryCardProps> = ({
  attendedSessionsThisMonth,
  totalSessionsThisMonth = 0,
}) => {
  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-purple-100 shadow-sm">
      {/* Header */}
      <View className="flex-row-reverse items-center justify-end mb-4">
        <Text className="text-lg font-bold text-gray-900 mr-2">ملخص الشهر</Text>
        <Calendar size={20} color="#8b5cf6" />
      </View>

      {/* Stats row */}
      <View className="flex-row-reverse justify-around">
        <View className="items-center">
          <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-2">
            <CheckCircle size={24} color="#8b5cf6" />
          </View>
          <Text className="text-2xl font-bold text-gray-900">{attendedSessionsThisMonth}</Text>
          <Text className="text-sm text-gray-500">جلسات حضرتها</Text>
        </View>

        {totalSessionsThisMonth > 0 && (
          <View className="items-center">
            <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-2">
              <Calendar size={24} color="#16a34a" />
            </View>
            <Text className="text-2xl font-bold text-gray-900">{totalSessionsThisMonth}</Text>
            <Text className="text-sm text-gray-500">إجمالي الحجوزات</Text>
          </View>
        )}
      </View>
    </View>
  );
};

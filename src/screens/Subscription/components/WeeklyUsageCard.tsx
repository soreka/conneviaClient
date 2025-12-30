// src/screens/Subscription/components/WeeklyUsageCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Activity } from 'lucide-react-native';

interface WeeklyUsageCardProps {
  usedThisWeek: number;
  weeklyLimit: number;
  sessionsLeftThisWeek: number;
  weekStartISO?: string;
  weekEndISO?: string;
}

export const WeeklyUsageCard: React.FC<WeeklyUsageCardProps> = ({
  usedThisWeek,
  weeklyLimit,
  sessionsLeftThisWeek,
}) => {
  const progressPercentage = weeklyLimit > 0 ? (usedThisWeek / weeklyLimit) * 100 : 0;
  const isLimitReached = sessionsLeftThisWeek <= 0;

  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-purple-100 shadow-sm">
      {/* Header */}
      <View className="flex-row-reverse items-center justify-end mb-4">
        <Text className="text-lg font-bold text-gray-900 mr-2">استخدامي هذا الأسبوع</Text>
        <Activity size={20} color="#8b5cf6" />
      </View>

      {/* Usage stats */}
      <View className="flex-row-reverse justify-between items-center mb-3">
        <Text className="text-sm text-gray-500">الجلسات المستخدمة</Text>
        <Text className="text-xl font-bold text-gray-900">
          {usedThisWeek} / {weeklyLimit}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="h-3 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <View
          className={`h-full rounded-full ${isLimitReached ? 'bg-red-500' : 'bg-purple-500'}`}
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </View>

      {/* Remaining sessions */}
      <View className="flex-row-reverse justify-between items-center">
        <Text className="text-sm text-gray-500">المتبقي هذا الأسبوع</Text>
        <Text className={`text-lg font-bold ${isLimitReached ? 'text-red-500' : 'text-green-600'}`}>
          {sessionsLeftThisWeek} {sessionsLeftThisWeek === 1 ? 'جلسة' : 'جلسات'}
        </Text>
      </View>
    </View>
  );
};

// src/screens/Dashboard/components/UsageCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TrendingUp } from 'lucide-react-native';

interface UsageData {
  weeklyLimit: number;
  weeklyUsed: number;
  weeklyLeft: number;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyLeft: number;
}

interface UsageCardProps {
  usage?: UsageData | null;
  hasSubscription?: boolean;
  onViewPlansPress?: () => void;
}

const ProgressBar: React.FC<{ used: number; total: number; color?: string }> = ({
  used,
  total,
  color = '#8b5cf6',
}) => {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  
  return (
    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <View
        className="h-full rounded-full"
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

export const UsageCard: React.FC<UsageCardProps> = ({
  usage,
  hasSubscription = true,
  onViewPlansPress,
}) => {
  if (!hasSubscription) {
    return (
      <View
        className="bg-white rounded-2xl mx-5 mt-4 p-4"
        style={{
          borderWidth: 1,
          borderColor: '#EDEDED',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-end mb-3">
          <Text className="text-lg font-bold text-gray-900 mr-2">استخدامك</Text>
          <TrendingUp size={20} color="#8b5cf6" />
        </View>
        
        <View className="items-center py-4">
          <Text className="text-base text-gray-500 mb-4 text-center">
            لا يوجد اشتراك نشط حالياً
          </Text>
          <TouchableOpacity
            onPress={onViewPlansPress}
            className="bg-purple-600 px-6 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">
              عرض خيارات الاشتراك
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!usage) return null;

  const getWeeklyMessage = () => {
    if (usage.weeklyLeft > 0) {
      return `تبقّى لك ${usage.weeklyLeft} حصص هذا الأسبوع ✨`;
    }
    return 'وصلتِ للحد الأسبوعي (3 حصص) 💪';
  };

  const getMonthlyMessage = () => {
    if (usage.monthlyLeft === 0) {
      return 'انتهت حصص هذا الشهر';
    }
    return `تبقّى ${usage.monthlyLeft} حصص من اشتراكك الشهري`;
  };

  return (
    <View
      className="bg-white rounded-2xl mx-5 mt-4 p-4"
      style={{
        borderWidth: 1,
        borderColor: '#EDEDED',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-end mb-4">
        <Text className="text-lg font-bold text-gray-900 mr-2">استخدامك</Text>
        <TrendingUp size={20} color="#8b5cf6" />
      </View>

      {/* Weekly Usage */}
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-gray-700">
            {usage.weeklyUsed} / {usage.weeklyLimit}
          </Text>
          <Text className="text-sm text-gray-600">الحد الأسبوعي</Text>
        </View>
        <ProgressBar 
          used={usage.weeklyUsed} 
          total={usage.weeklyLimit} 
          color={usage.weeklyLeft > 0 ? '#8b5cf6' : '#EF4444'} 
        />
        <Text className={`text-xs mt-1.5 text-right ${usage.weeklyLeft > 0 ? 'text-purple-600' : 'text-amber-600'}`}>
          {getWeeklyMessage()}
        </Text>
      </View>

      {/* Monthly Usage */}
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-gray-700">
            {usage.monthlyUsed} / {usage.monthlyLimit}
          </Text>
          <Text className="text-sm text-gray-600">الحصص الشهرية</Text>
        </View>
        <ProgressBar 
          used={usage.monthlyUsed} 
          total={usage.monthlyLimit}
          color={usage.monthlyLeft > 0 ? '#10B981' : '#EF4444'}
        />
        <Text className={`text-xs mt-1.5 text-right ${usage.monthlyLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {getMonthlyMessage()}
        </Text>
      </View>
    </View>
  );
};

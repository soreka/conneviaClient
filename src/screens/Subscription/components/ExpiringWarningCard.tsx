// src/screens/Subscription/components/ExpiringWarningCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface ExpiringWarningCardProps {
  daysRemaining: number;
  endDate: string;
  onRenew?: () => void;
}

export const ExpiringWarningCard: React.FC<ExpiringWarningCardProps> = ({
  daysRemaining,
  endDate,
  onRenew,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View className="bg-orange-50 rounded-2xl p-4 mb-4 border border-orange-200">
      <View className="flex-row-reverse items-start">
        <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center ml-3">
          <AlertTriangle size={20} color="#ea580c" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-orange-800 text-right mb-1">
            اشتراكك ينتهي قريباً!
          </Text>
          <Text className="text-sm text-orange-700 text-right mb-2">
            متبقي {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'} على انتهاء اشتراكك
          </Text>
          <Text className="text-xs text-orange-600 text-right">
            تاريخ الانتهاء: {formatDate(endDate)}
          </Text>
        </View>
      </View>

      {onRenew && (
        <TouchableOpacity
          onPress={onRenew}
          className="bg-orange-500 rounded-xl py-3 mt-4"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-center">تجديد الاشتراك</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

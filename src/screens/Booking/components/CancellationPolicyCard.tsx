import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export const CancellationPolicyCard: React.FC = () => {
  return (
    <View className="bg-warning/15 rounded-2xl p-4 mb-5 flex-row items-start">
      {/* Text Content */}
      <View className="flex-1 pl-3">
        <Text className="text-sm font-semibold text-warning text-right mb-1.5">
          سياسة الإلغاء
        </Text>
        <Text className="text-xs text-warning/80 text-right leading-5">
          يمكنك إلغاء الحجز قبل يومين فقط من موعد الحصة.
          {'\n'}
          الإلغاء المتأخر قد يؤثر على اشتراكك.
        </Text>
      </View>
      
      {/* Warning Icon */}
      <View className="w-9 h-9 rounded-full bg-warning/25 items-center justify-center">
        <AlertTriangle size={18} color="#F59E0B" />
      </View>
    </View>
  );
};

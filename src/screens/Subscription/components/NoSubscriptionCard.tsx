// src/screens/Subscription/components/NoSubscriptionCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CreditCard, ArrowLeft } from 'lucide-react-native';

interface NoSubscriptionCardProps {
  onViewPlans: () => void;
}

export const NoSubscriptionCard: React.FC<NoSubscriptionCardProps> = ({
  onViewPlans,
}) => {
  return (
    <View className="bg-white rounded-2xl p-6 mb-4 border border-purple-100 shadow-sm items-center">
      <View className="w-20 h-20 bg-purple-100 rounded-full items-center justify-center mb-4">
        <CreditCard size={40} color="#8b5cf6" />
      </View>

      <Text className="text-xl font-bold text-gray-900 text-center mb-2">
        لا يوجد اشتراك حالي
      </Text>

      <Text className="text-sm text-gray-500 text-center mb-6 px-4">
        اشترك الآن للاستمتاع بجلسات البيلاتس والحصول على أفضل العروض
      </Text>

      <TouchableOpacity
        onPress={onViewPlans}
        className="bg-purple-600 rounded-xl py-4 px-8 flex-row items-center"
        activeOpacity={0.8}
      >
        <ArrowLeft size={20} color="#fff" style={{ marginLeft: 8 }} />
        <Text className="text-white font-bold text-base">عرض خطط الاشتراك</Text>
      </TouchableOpacity>
    </View>
  );
};

// src/screens/Subscription/components/SubscriptionInfoCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Info, CheckCircle } from 'lucide-react-native';

interface SubscriptionInfoCardProps {
  title?: string;
  items?: string[];
}

const DEFAULT_INFO_ITEMS = [
  'احجز جلساتك بسهولة عبر التطبيق',
  'إلغاء الحجز مجاني قبل 48 ساعة',
  'تجديد تلقائي شهري',
  'دعم فني على مدار الساعة',
];

export const SubscriptionInfoCard: React.FC<SubscriptionInfoCardProps> = ({
  title = 'معلومات الاشتراك',
  items = DEFAULT_INFO_ITEMS,
}) => {
  return (
    <View className="bg-purple-50 rounded-2xl p-4 mb-4 border border-purple-100">
      <View className="flex-row-reverse items-center justify-end mb-3">
        <Text className="text-base font-bold text-purple-900 mr-2">{title}</Text>
        <Info size={18} color="#7c3aed" />
      </View>

      {items.map((item, index) => (
        <View key={index} className="flex-row-reverse items-center mb-2">
          <CheckCircle size={16} color="#8b5cf6" />
          <Text className="text-sm text-purple-800 mr-2 flex-1 text-right">
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
};

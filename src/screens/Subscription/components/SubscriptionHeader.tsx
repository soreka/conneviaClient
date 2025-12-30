// src/screens/Subscription/components/SubscriptionHeader.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { CreditCard } from 'lucide-react-native';

interface SubscriptionHeaderProps {
  title?: string;
  subtitle?: string;
}

export const SubscriptionHeader: React.FC<SubscriptionHeaderProps> = ({
  title = 'اشتراكي',
  subtitle,
}) => {
  return (
    <View className="mb-6">
      <View className="flex-row-reverse items-center justify-end mb-2">
        <Text className="text-2xl font-bold text-gray-900 mr-2">{title}</Text>
        <CreditCard size={28} color="#8b5cf6" />
      </View>
      {subtitle && (
        <Text className="text-sm text-gray-500 text-right">{subtitle}</Text>
      )}
    </View>
  );
};

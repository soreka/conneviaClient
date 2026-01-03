import React from 'react';
import { View, Text } from 'react-native';

interface FeatureItem {
  emoji: string;
  label: string;
  borderColor: string;
}

// Order: right to left in RTL (تدريب احترافي, حجز سهل, بيئة نسائية)
const features: FeatureItem[] = [
  { emoji: '🧘', label: 'تدريب احترافي', borderColor: '#A68CD4' },
  { emoji: '📅', label: 'حجز سهل', borderColor: '#F2C6DE' },
  { emoji: '💜', label: 'بيئة نسائية', borderColor: '#A68CD4' },
];

export const FeatureCards: React.FC = () => {
  return (
    <View className="flex-row-reverse justify-between pb-6 gap-2">
      {features.map((feature, index) => (
        <View
          key={index}
          className="flex-1 py-4 px-2 items-center rounded-2xl border-[1.5px]"
          style={{ borderColor: feature.borderColor }}
        >
          <Text className="text-2xl mb-2">{feature.emoji}</Text>
          <Text className="text-xs font-medium text-[#666666] text-center">
            {feature.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

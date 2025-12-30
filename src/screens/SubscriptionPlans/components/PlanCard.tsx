// src/screens/SubscriptionPlans/components/PlanCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle, Star } from 'lucide-react-native';

interface PlanCardProps {
  id: string;
  name: string;
  monthlyLimit: number; // 4 or 8 sessions per month
  price: number;
  priceFormatted: string;
  isPopular?: boolean;
  isSelected?: boolean;
  isCurrentPlan?: boolean;
  isDisabled?: boolean;
  onSelect: () => void;
  actionLabel?: string;
}

const MONTHLY_LIMIT_TITLES: Record<number, string> = {
  4: '4 جلسات في الشهر',
  8: '8 جلسات في الشهر',
};

const PLAN_DESCRIPTIONS: Record<number, string> = {
  4: 'للمبتدئين الذين يريدون بداية خفيفة',
  8: 'للراغبين في تحسين لياقتهم بشكل منتظم',
};

const PLAN_FEATURES: Record<number, string[]> = {
  4: [
    '4 جلسات شهرياً',
    'حد أقصى 3 جلسات أسبوعياً',
    'إلغاء مجاني قبل 48 ساعة',
  ],
  8: [
    '8 جلسات شهرياً',
    'حد أقصى 3 جلسات أسبوعياً',
    'إلغاء مجاني قبل 48 ساعة',
  ],
};

export const PlanCard: React.FC<PlanCardProps> = ({
  id,
  name,
  monthlyLimit,
  price,
  priceFormatted,
  isPopular = false,
  isSelected = false,
  isCurrentPlan = false,
  isDisabled = false,
  onSelect,
  actionLabel,
}) => {
  const title = MONTHLY_LIMIT_TITLES[monthlyLimit] || `${monthlyLimit} جلسات في الشهر`;
  const description = PLAN_DESCRIPTIONS[monthlyLimit] || 'باقة مميزة';
  const features = PLAN_FEATURES[monthlyLimit] || [
    `${monthlyLimit} جلسات شهرياً`,
    'حد أقصى 3 جلسات أسبوعياً',
    'إلغاء مجاني قبل 48 ساعة',
  ];

  const borderColor = isCurrentPlan
    ? 'border-green-500'
    : isSelected
    ? 'border-purple-500'
    : isPopular
    ? 'border-purple-200'
    : 'border-gray-100';

  const buttonLabel = actionLabel || (isSelected ? 'تم الاختيار ✓' : 'اختيار هذه الباقة');

  return (
    <View
      className={`bg-white rounded-2xl p-4 mb-4 border-2 shadow-sm ${borderColor} ${
        isDisabled ? 'opacity-60' : ''
      }`}
    >
      {/* Popular badge */}
      {isPopular && !isCurrentPlan && (
        <View className="absolute -top-3 right-4 bg-purple-600 px-3 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">الأكثر طلباً</Text>
        </View>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <View className="absolute -top-3 right-4 bg-green-600 px-3 py-1 rounded-full flex-row items-center">
          <Star size={12} color="#fff" />
          <Text className="text-white text-xs font-bold mr-1">باقتك الحالية</Text>
        </View>
      )}

      {/* Header */}
      <View className="flex-row-reverse items-center justify-between mb-3 mt-1">
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
        {isSelected && <CheckCircle size={24} color="#8b5cf6" />}
      </View>

      {/* Description */}
      <Text className="text-sm text-gray-500 text-right mb-4">{description}</Text>

      {/* Features */}
      <View className="mb-4">
        {features.map((feature, index) => (
          <View key={index} className="flex-row-reverse items-center mb-2">
            <View className="w-5 h-5 bg-purple-100 rounded-full items-center justify-center">
              <CheckCircle size={12} color="#8b5cf6" />
            </View>
            <Text className="text-sm text-gray-700 mr-2 flex-1 text-right">{feature}</Text>
          </View>
        ))}
      </View>

      {/* Price */}
      <View className="flex-row-reverse items-baseline justify-end mb-4">
        <Text className="text-3xl font-bold text-purple-600">{priceFormatted.replace(' ₪', '')}</Text>
        <Text className="text-base text-gray-500 mr-1">₪ / شهرياً</Text>
      </View>

      {/* Select button */}
      <TouchableOpacity
        onPress={onSelect}
        disabled={isDisabled}
        className={`rounded-xl py-3 ${
          isDisabled
            ? 'bg-gray-200'
            : isCurrentPlan
            ? 'bg-green-100'
            : isSelected
            ? 'bg-purple-600'
            : 'bg-purple-100'
        }`}
        activeOpacity={0.8}
      >
        <Text
          className={`text-center font-bold ${
            isDisabled
              ? 'text-gray-400'
              : isCurrentPlan
              ? 'text-green-700'
              : isSelected
              ? 'text-white'
              : 'text-purple-700'
          }`}
        >
          {buttonLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

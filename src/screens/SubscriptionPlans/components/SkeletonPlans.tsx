// src/screens/SubscriptionPlans/components/SkeletonPlans.tsx
import React from 'react';
import { View } from 'react-native';

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <View className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />
);

const SkeletonPlanCard: React.FC = () => (
  <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
    {/* Header */}
    <View className="flex-row-reverse items-center justify-between mb-4">
      <SkeletonBox className="h-6 w-32" />
      <SkeletonBox className="h-6 w-16 rounded-full" />
    </View>

    {/* Description */}
    <SkeletonBox className="h-4 w-48 mb-4 self-end" />

    {/* Features */}
    <View className="mb-4">
      <View className="flex-row-reverse items-center mb-2">
        <SkeletonBox className="w-5 h-5 rounded-full" />
        <SkeletonBox className="h-4 w-40 mr-2" />
      </View>
      <View className="flex-row-reverse items-center mb-2">
        <SkeletonBox className="w-5 h-5 rounded-full" />
        <SkeletonBox className="h-4 w-36 mr-2" />
      </View>
      <View className="flex-row-reverse items-center">
        <SkeletonBox className="w-5 h-5 rounded-full" />
        <SkeletonBox className="h-4 w-44 mr-2" />
      </View>
    </View>

    {/* Price */}
    <View className="flex-row-reverse items-baseline justify-end mb-4">
      <SkeletonBox className="h-8 w-20" />
      <SkeletonBox className="h-4 w-12 mr-1" />
    </View>

    {/* Button */}
    <SkeletonBox className="h-12 w-full rounded-xl" />
  </View>
);

export const SkeletonPlans: React.FC = () => {
  return (
    <View className="p-4">
      {/* Header skeleton */}
      <View className="mb-6">
        <SkeletonBox className="h-8 w-40 mb-2 self-end" />
        <SkeletonBox className="h-4 w-56 self-end" />
      </View>

      {/* Plan cards */}
      <SkeletonPlanCard />
      <SkeletonPlanCard />
      <SkeletonPlanCard />
    </View>
  );
};

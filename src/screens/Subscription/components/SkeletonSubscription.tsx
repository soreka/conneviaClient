// src/screens/Subscription/components/SkeletonSubscription.tsx
import React from 'react';
import { View } from 'react-native';

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <View className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />
);

export const SkeletonSubscription: React.FC = () => {
  return (
    <View className="p-4">
      {/* Header skeleton */}
      <View className="mb-6">
        <SkeletonBox className="h-8 w-32 mb-2 self-end" />
        <SkeletonBox className="h-4 w-48 self-end" />
      </View>

      {/* Subscription details card skeleton */}
      <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
        <View className="flex-row-reverse items-center justify-between mb-4">
          <SkeletonBox className="h-6 w-24" />
          <SkeletonBox className="h-6 w-16 rounded-full" />
        </View>
        <SkeletonBox className="h-5 w-40 mb-2 self-end" />
        <SkeletonBox className="h-4 w-32 self-end" />
        <View className="flex-row-reverse justify-between mt-4">
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-4 w-24" />
        </View>
      </View>

      {/* Weekly usage card skeleton */}
      <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
        <SkeletonBox className="h-6 w-36 mb-4 self-end" />
        <View className="flex-row-reverse justify-between items-center mb-3">
          <SkeletonBox className="h-4 w-28" />
          <SkeletonBox className="h-6 w-16" />
        </View>
        <View className="h-3 bg-gray-200 rounded-full mb-3">
          <View className="h-3 bg-gray-300 rounded-full w-1/2" />
        </View>
        <SkeletonBox className="h-4 w-24 self-end" />
      </View>

      {/* Monthly summary card skeleton */}
      <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
        <SkeletonBox className="h-6 w-32 mb-4 self-end" />
        <View className="flex-row-reverse justify-around">
          <View className="items-center">
            <SkeletonBox className="h-8 w-8 rounded-full mb-2" />
            <SkeletonBox className="h-4 w-16" />
          </View>
          <View className="items-center">
            <SkeletonBox className="h-8 w-8 rounded-full mb-2" />
            <SkeletonBox className="h-4 w-16" />
          </View>
        </View>
      </View>

      {/* Button skeleton */}
      <SkeletonBox className="h-12 w-full rounded-xl mt-4" />
    </View>
  );
};

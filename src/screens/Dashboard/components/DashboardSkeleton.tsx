// src/screens/Dashboard/components/DashboardSkeleton.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

const SkeletonPulse: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

const SkeletonBox: React.FC<{ className?: string; style?: any }> = ({ 
  className = '', 
  style 
}) => (
  <View className={`bg-gray-200 rounded ${className}`} style={style} />
);

export const NextBookingCardSkeleton: React.FC = () => (
  <SkeletonPulse>
    <View
      className="bg-white rounded-2xl mx-5 p-4"
      style={{
        marginTop: -40,
        borderWidth: 1,
        borderColor: '#EDEDED',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      {/* Header skeleton */}
      <View className="flex-row items-center justify-between mb-3">
        <SkeletonBox className="w-28 h-4" />
        <SkeletonBox className="w-24 h-5" />
      </View>

      {/* Badge & Date skeleton */}
      <View className="flex-row items-start justify-between mb-3">
        <SkeletonBox className="w-14 h-6 rounded-full" />
        <View className="items-end">
          <SkeletonBox className="w-32 h-5 mb-1" />
          <SkeletonBox className="w-20 h-4" />
        </View>
      </View>

      {/* Details Box skeleton */}
      <View className="bg-gray-50 rounded-xl p-3">
        <View className="flex-row items-center justify-end mb-2">
          <SkeletonBox className="w-24 h-4 mr-2" />
          <SkeletonBox className="w-4 h-4 rounded" />
        </View>
        <View className="flex-row items-center justify-end mb-2">
          <SkeletonBox className="w-28 h-4 mr-2" />
          <SkeletonBox className="w-4 h-4 rounded" />
        </View>
        <View className="flex-row items-center justify-end">
          <SkeletonBox className="w-20 h-4 mr-2" />
          <SkeletonBox className="w-4 h-4 rounded" />
        </View>
      </View>
    </View>
  </SkeletonPulse>
);

export const QuickActionsGridSkeleton: React.FC = () => (
  <SkeletonPulse>
    <View className="px-5 mt-5">
      <View className="flex-row justify-between">
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            className="flex-1 mx-1.5 bg-white rounded-2xl p-4 items-center"
            style={{
              borderWidth: 1,
              borderColor: '#EDEDED',
            }}
          >
            <SkeletonBox className="w-14 h-14 rounded-full mb-2" />
            <SkeletonBox className="w-16 h-3" />
          </View>
        ))}
      </View>
    </View>
  </SkeletonPulse>
);

export const UsageCardSkeleton: React.FC = () => (
  <SkeletonPulse>
    <View
      className="bg-white rounded-2xl mx-5 mt-4 p-4"
      style={{
        borderWidth: 1,
        borderColor: '#EDEDED',
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-end mb-4">
        <SkeletonBox className="w-20 h-5 mr-2" />
        <SkeletonBox className="w-5 h-5 rounded" />
      </View>

      {/* Weekly Usage */}
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <SkeletonBox className="w-12 h-4" />
          <SkeletonBox className="w-20 h-4" />
        </View>
        <SkeletonBox className="h-2 rounded-full" />
        <SkeletonBox className="w-40 h-3 mt-1.5 self-end" />
      </View>

      {/* Monthly Usage */}
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <SkeletonBox className="w-12 h-4" />
          <SkeletonBox className="w-24 h-4" />
        </View>
        <SkeletonBox className="h-2 rounded-full" />
        <SkeletonBox className="w-36 h-3 mt-1.5 self-end" />
      </View>
    </View>
  </SkeletonPulse>
);

export const DailyTipCardSkeleton: React.FC = () => (
  <SkeletonPulse>
    <View
      className="bg-amber-50 rounded-2xl mx-5 mt-4 mb-6 p-4"
      style={{
        borderWidth: 1,
        borderColor: '#FDE68A',
      }}
    >
      <View className="flex-row items-center justify-end mb-2">
        <SkeletonBox className="w-20 h-4 mr-2 bg-amber-200" />
        <SkeletonBox className="w-8 h-8 rounded-full bg-amber-200" />
      </View>
      <SkeletonBox className="h-4 mb-2 bg-amber-200" />
      <SkeletonBox className="w-3/4 h-4 self-end bg-amber-200" />
    </View>
  </SkeletonPulse>
);

export const DashboardSkeleton: React.FC = () => (
  <View>
    <NextBookingCardSkeleton />
    <QuickActionsGridSkeleton />
    <UsageCardSkeleton />
    <DailyTipCardSkeleton />
  </View>
);

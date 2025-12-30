// src/screens/AdminScheduleSettings/components/ScheduleSettingsSkeleton.tsx
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
  style,
}) => <View className={`bg-gray-200 rounded ${className}`} style={style} />;

// Day card skeleton
const DayCardSkeleton: React.FC = () => (
  <View
    className="bg-white rounded-2xl p-4 mb-3 mx-5"
    style={{
      borderWidth: 1,
      borderColor: '#E5E7EB',
    }}
  >
    <View className="flex-row items-center justify-between mb-2">
      <SkeletonBox className="w-10 h-6 rounded-full" />
      <SkeletonBox className="w-20 h-5" />
    </View>
    <View className="flex-row items-center justify-between">
      <SkeletonBox className="w-4 h-4" />
      <SkeletonBox className="w-28 h-4" />
    </View>
  </View>
);

// Auto generate section skeleton
const AutoGenerateSkeleton: React.FC = () => (
  <View
    className="bg-white rounded-2xl mx-5 mt-4 p-4"
    style={{
      borderWidth: 1,
      borderColor: '#E5E7EB',
    }}
  >
    {/* Header */}
    <View className="flex-row-reverse items-center justify-end mb-4">
      <SkeletonBox className="w-36 h-5 mr-2" />
      <SkeletonBox className="w-5 h-5 rounded" />
    </View>

    {/* Duration */}
    <SkeletonBox className="w-16 h-4 mb-2 self-end" />
    <View className="flex-row gap-2 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonBox key={i} className="w-20 h-10 rounded-lg" />
      ))}
    </View>

    {/* Days */}
    <SkeletonBox className="w-20 h-4 mb-2 self-end" />
    <View className="flex-row flex-wrap gap-2 mb-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonBox key={i} className="w-16 h-9 rounded-lg" />
      ))}
    </View>

    {/* Button */}
    <SkeletonBox className="h-12 rounded-xl" />
  </View>
);

export const ScheduleSettingsSkeleton: React.FC = () => (
  <SkeletonPulse>
    <View className="pt-4">
      {/* Days list */}
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <DayCardSkeleton key={i} />
      ))}

      {/* Auto generate section */}
      <AutoGenerateSkeleton />

      <View className="h-6" />
    </View>
  </SkeletonPulse>
);

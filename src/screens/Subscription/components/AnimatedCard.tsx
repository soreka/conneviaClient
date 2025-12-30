// src/screens/Subscription/components/AnimatedCard.tsx
import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  style?: ViewStyle;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  index = 0,
  delay = 100,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const animationDelay = index * delay;
    opacity.value = withDelay(animationDelay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(animationDelay, withTiming(0, { duration: 300 }));
  }, [index, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

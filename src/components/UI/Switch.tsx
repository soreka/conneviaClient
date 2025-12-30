// src/components/UI/Switch.tsx
import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, View } from 'react-native';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { track: { width: 36, height: 20 }, thumb: 16 },
  md: { track: { width: 44, height: 24 }, thumb: 20 },
  lg: { track: { width: 52, height: 28 }, thumb: 24 },
};

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  size = 'md',
}) => {
  const translateX = useRef(new Animated.Value(value ? 1 : 0)).current;
  const { track, thumb } = SIZES[size];
  const padding = 2;
  const maxTranslate = track.width - thumb - padding * 2;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [value, translateX]);

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const thumbTranslateX = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxTranslate],
  });

  const trackColor = value ? '#8b5cf6' : '#D1D5DB';
  const thumbColor = '#FFFFFF';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          width: track.width,
          height: track.height,
          borderRadius: track.height / 2,
          backgroundColor: trackColor,
          padding: padding,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: thumb,
            height: thumb,
            borderRadius: thumb / 2,
            backgroundColor: thumbColor,
            transform: [{ translateX: thumbTranslateX }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </View>
    </TouchableOpacity>
  );
};

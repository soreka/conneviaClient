import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MyBookingsHeaderProps {
  onBackPress: () => void;
}

export const MyBookingsHeader: React.FC<MyBookingsHeaderProps> = ({ onBackPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#B79AF2', '#A77BEA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + 12,
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
      }}
    >
      <View className="flex-row items-center justify-between px-5">
        {/* Back Button - Left side (RTL: appears on left) */}
        <Pressable
          onPress={onBackPress}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
        >
          <ChevronRight size={24} color="#ffffff" />
        </Pressable>

        {/* Spacer */}
        <View className="flex-1" />

        {/* Title - Right side (RTL) */}
        <Text className="text-2xl font-bold text-white">
          حجوزاتي
        </Text>
      </View>
    </LinearGradient>
  );
};

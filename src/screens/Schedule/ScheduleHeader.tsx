import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScheduleHeaderProps {
  onBackPress: () => void;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({ onBackPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#A68CD4', '#F2C6DE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="px-4 pb-6"
      style={{ paddingTop: insets.top + 16 }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="w-10" />
        <View className="flex-1" />
        <Pressable
          onPress={onBackPress}
          className="w-10 h-10 items-center justify-center"
        >
          <ArrowRight size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <Text className="text-2xl font-bold text-white text-center mb-2">
        الجدول الأسبوعي
      </Text>
      <Text className="text-base text-white/90 text-center">
        تصفحي الحصص المتاحة واحجزي مكانك
      </Text>
    </LinearGradient>
  );
};

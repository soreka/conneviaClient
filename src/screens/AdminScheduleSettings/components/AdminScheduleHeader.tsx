// src/screens/AdminScheduleSettings/components/AdminScheduleHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight, Settings } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdminScheduleHeaderProps {
  onBackPress: () => void;
}

export const AdminScheduleHeader: React.FC<AdminScheduleHeaderProps> = ({
  onBackPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#8b5cf6', '#a78bfa', '#c4b5fd']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top }}
    >
      <View className="px-5 pt-4 pb-6">
        {/* Top row */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="w-10" />
          <TouchableOpacity
            onPress={onBackPress}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View className="flex-row-reverse items-center justify-end">
          <Text className="text-2xl font-bold text-white mr-2">إعدادات الجدول</Text>
          <Settings size={28} color="#FFFFFF" />
        </View>
        <Text className="text-base text-white/80 text-right mt-1">
          إدارة أوقات العمل وإنشاء الحصص تلقائياً
        </Text>
      </View>
    </LinearGradient>
  );
};

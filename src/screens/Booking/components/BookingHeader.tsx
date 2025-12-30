import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';

interface BookingHeaderProps {
  step: number;
  totalSteps: number;
  onBack: () => void;
}

const stepSubtitles: Record<number, string> = {
  1: 'اختاري اليوم المناسب لك',
  2: 'اختاري الحصة',
  3: 'اختاري السرير',
  4: 'تأكيد الحجز',
};

export const BookingHeader: React.FC<BookingHeaderProps> = ({
  step,
  totalSteps,
  onBack,
}) => {
  return (
    <LinearGradient
      colors={['#A68CD4', '#F2C6DE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="px-5 pt-4 pb-6 rounded-b-3xl"
    >
      {/* Top Row: Back Button (right for RTL) + Step Indicator (left) */}
      <View className="flex-row justify-between items-center mb-5">
        {/* Step Indicator */}
        <View className="bg-white/20 px-4 py-2 rounded-full">
          <Text className="text-sm text-white font-medium">
            الخطوة {step} من {totalSteps}
          </Text>
        </View>
        
        {/* Back Button - ChevronRight for RTL back navigation */}
        <Pressable
          onPress={onBack}
          className="w-11 h-11 rounded-full bg-white/20 items-center justify-center"
        >
          <ChevronRight size={24} color="#ffffff" />
        </Pressable>
      </View>
      
      {/* Title */}
      <Text className="text-2xl font-bold text-white text-right mb-2">
        احجزي حصتك
      </Text>
      
      {/* Subtitle */}
      <Text className="text-base text-white/90 text-right mb-5">
        {stepSubtitles[step]}
      </Text>
      
      {/* Progress Bar */}
      <View className="h-1 bg-white/30 rounded-full overflow-hidden">
        <View 
          className="h-full bg-white rounded-full"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </View>
    </LinearGradient>
  );
};

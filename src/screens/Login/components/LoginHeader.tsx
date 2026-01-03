import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface LoginHeaderProps {
  onBack?: () => void;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({ onBack }) => {
  return (
    <View className="flex-row-reverse items-center justify-between px-4 py-4">
      <Pressable 
        className="w-10 h-10 rounded-lg items-center justify-center"
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => pressed ? { backgroundColor: '#FCE8F0' } : {}}
      >
        <ArrowRight size={20} color="#666666" />
      </Pressable>
      <Text className="text-lg font-semibold text-[#666666] text-center">
        تسجيل الدخول
      </Text>
      <View className="w-10" />
    </View>
  );
};

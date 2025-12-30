// src/screens/Dashboard/components/DailyTipCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Lightbulb } from 'lucide-react-native';

interface DailyTipCardProps {
  tip: string;
}

export const DailyTipCard: React.FC<DailyTipCardProps> = ({ tip }) => {
  return (
    <View
      className="bg-amber-50 rounded-2xl mx-5 mt-4 mb-6 p-4"
      style={{
        borderWidth: 1,
        borderColor: '#FDE68A',
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-end mb-2">
        <Text className="text-base font-bold text-amber-800 mr-2">نصيحة اليوم</Text>
        <View className="w-8 h-8 rounded-full bg-amber-200 items-center justify-center">
          <Lightbulb size={18} color="#B45309" />
        </View>
      </View>

      {/* Tip text */}
      <Text className="text-sm text-amber-700 text-right leading-6">
        {tip}
      </Text>
    </View>
  );
};

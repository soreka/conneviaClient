// src/components/PlaceholderScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';

interface PlaceholderScreenProps {
  title: string;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title }) => {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-2xl font-bold text-gray-800 mb-2">{title}</Text>
      <Text className="text-gray-500">قريباً...</Text>
    </View>
  );
};

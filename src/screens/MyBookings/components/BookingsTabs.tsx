import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type BookingTabType = 'upcoming' | 'past';

interface BookingsTabsProps {
  activeTab: BookingTabType;
  onTabChange: (tab: BookingTabType) => void;
}

export const BookingsTabs: React.FC<BookingsTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View className="px-5 py-4">
      <View 
        className="flex-row rounded-full p-1"
        style={{ backgroundColor: '#F0F0F0' }}
      >
        {/* Past Tab - Right side (RTL) */}
        <Pressable
          onPress={() => onTabChange('past')}
          className={`flex-1 py-3 rounded-full items-center justify-center ${
            activeTab === 'past' ? 'bg-white' : ''
          }`}
          style={activeTab === 'past' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          } : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === 'past' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            الحجوزات السابقة
          </Text>
        </Pressable>

        {/* Upcoming Tab - Left side (RTL) */}
        <Pressable
          onPress={() => onTabChange('upcoming')}
          className={`flex-1 py-3 rounded-full items-center justify-center ${
            activeTab === 'upcoming' ? 'bg-white' : ''
          }`}
          style={activeTab === 'upcoming' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          } : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === 'upcoming' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            الحجوزات القادمة
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

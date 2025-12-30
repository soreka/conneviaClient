// src/components/schedule/WeekDayTabs.tsx
// Role: Shared week day tabs component for Customer and Admin schedule screens
// Days ordered: Sunday first (الأحد → السبت), RTL layout with 2 rows (4 + 3)
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/utils';

export interface DayItem {
  date: Date;
  name: string;
  enabled: boolean;
}

interface WeekDayTabsProps {
  days: DayItem[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
}

export const WeekDayTabs: React.FC<WeekDayTabsProps> = ({
  days,
  selectedIndex,
  onSelectDay,
}) => {
  // Row 1: الأحد، الإثنين، الثلاثاء، الأربعاء (indices 0-3)
  // Row 2: الخميس، الجمعة، السبت (indices 4-6)
  const row1 = days.slice(0, 4);
  const row2 = days.slice(4, 7);

  const renderTab = (day: DayItem, index: number) => {
    const isSelected = selectedIndex === index;
    const isDisabled = !day.enabled;

    return (
      <Pressable
        key={index}
        onPress={() => !isDisabled && onSelectDay(index)}
        disabled={isDisabled}
        style={{
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 4,
          backgroundColor: isSelected 
            ? '#8b5cf6' 
            : isDisabled 
              ? '#f3f4f6' 
              : '#f3f4f6',
          opacity: isDisabled ? 0.4 : 1,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isSelected ? '#ffffff' : '#374151',
          }}
        >
          {day.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff' }}>
      {/* Row 1: 4 days - RTL order (first item on right) */}
      <View style={{ flexDirection: 'row-reverse', marginBottom: 8 }}>
        {row1.map((day, idx) => renderTab(day, idx))}
      </View>
      {/* Row 2: 3 days - RTL order, centered */}
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'center' }}>
        {row2.map((day, idx) => renderTab(day, idx + 4))}
      </View>
    </View>
  );
};

export default WeekDayTabs;

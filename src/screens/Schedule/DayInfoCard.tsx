// src/screens/Schedule/DayInfoCard.tsx
// Role: Day info strip matching Lovable design - calendar icon + day name on right, date on left
import React from 'react';
import { View, Text } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { formatArabicDayName, formatArabicDate } from '../../utils/dates';

interface DayInfoCardProps {
  selectedDate: Date;
}

export const DayInfoCard: React.FC<DayInfoCardProps> = ({ selectedDate }) => {
  const dayName = formatArabicDayName(selectedDate);
  const dateStr = formatArabicDate(selectedDate);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: '#f8f7fc',
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Right side: Calendar icon + Day name */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
          <Calendar size={20} color="#8b5cf6" />
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: '#1f2937',
              marginRight: 8,
            }}
          >
            {dayName}
          </Text>
        </View>
        {/* Left side: Date */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: '#6b7280',
          }}
        >
          {dateStr}
        </Text>
      </View>
    </View>
  );
};

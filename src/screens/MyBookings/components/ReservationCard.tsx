import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, AlertCircle } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Simple pilates/reformer icon
const PilatesIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 18, 
  color = '#666666' 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="14" width="20" height="3" rx="1.5" fill={color} opacity={0.3} />
    <Rect x="4" y="10" width="16" height="2" rx="1" fill={color} opacity={0.5} />
    <Circle cx="6" cy="17" r="2" fill={color} />
    <Circle cx="18" cy="17" r="2" fill={color} />
    <Path d="M8 8 L16 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Simple bed icon for the card
const BedSmallIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 18, 
  color = '#666666' 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M3 18V12C3 10.3431 4.34315 9 6 9H18C19.6569 9 21 10.3431 21 12V18" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <Path 
      d="M3 18V20M21 18V20" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <Rect x="6" y="6" width="5" height="3" rx="1.5" fill={color} opacity={0.5} />
    <Rect x="13" y="6" width="5" height="3" rx="1.5" fill={color} opacity={0.5} />
    <Path d="M2 18H22" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export type ReservationStatus = 'upcoming' | 'attended' | 'missed';

export interface ReservationCardProps {
  dayName: string;
  dateLabel: string;
  timeRange: string;
  bedNumber: number;
  sessionType: string;
  status: ReservationStatus;
  canCancel?: boolean;
  onPress?: () => void;
}

const getStatusBadge = (status: ReservationStatus) => {
  switch (status) {
    case 'upcoming':
      return {
        text: 'مؤكد',
        bgColor: '#E8F5E9',
        textColor: '#2E7D32',
      };
    case 'attended':
      return {
        text: 'حضرت',
        bgColor: '#E8F5E9',
        textColor: '#2E7D32',
      };
    case 'missed':
      return {
        text: 'لم أحضر',
        bgColor: '#F5F5F5',
        textColor: '#757575',
      };
  }
};

export const ReservationCard: React.FC<ReservationCardProps> = ({
  dayName,
  dateLabel,
  timeRange,
  bedNumber,
  sessionType,
  status,
  canCancel,
  onPress,
}) => {
  const badge = getStatusBadge(status);
  const showCancelWarning = status === 'upcoming' && canCancel === false;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 mx-5 active:opacity-90"
      style={{
        borderWidth: 1,
        borderColor: '#EDEDED',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Top Row: Day/Date on right, Badge on left */}
      <View className="flex-row items-start justify-between mb-3">
        {/* Badge - Left (in RTL appears on left) */}
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: badge.bgColor }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: badge.textColor }}
          >
            {badge.text}
          </Text>
        </View>

        {/* Day & Date - Right (in RTL appears on right) */}
        <View className="items-end">
          <Text className="text-lg font-bold text-gray-900 mb-0.5">
            {dayName}
          </Text>
          <Text className="text-sm text-gray-500">
            {dateLabel}
          </Text>
        </View>
      </View>

      {/* Info Box */}
      <View
        className="rounded-xl p-3"
        style={{ backgroundColor: '#F6F6F6' }}
      >
        {/* Time Row */}
        <View className="flex-row items-center justify-end mb-2">
          <Text className="text-sm text-gray-700 mr-2">
            {timeRange}
          </Text>
          <Clock size={16} color="#666666" />
        </View>

        {/* Bed Row */}
        <View className="flex-row items-center justify-end mb-2">
          <Text className="text-sm text-gray-700 mr-2">
            سرير رقم {bedNumber}
          </Text>
          <BedSmallIcon size={16} color="#666666" />
        </View>

        {/* Session Type Row */}
        <View className="flex-row items-center justify-end">
          <Text className="text-sm text-gray-700 mr-2">
            {sessionType}
          </Text>
          <PilatesIcon size={16} color="#666666" />
        </View>
      </View>

      {/* Cancel Warning for upcoming bookings that cannot be cancelled */}
      {showCancelWarning && (
        <View className="flex-row items-center justify-end mt-2 pt-2">
          <Text className="text-xs text-amber-600 mr-1">
            لا يمكن الإلغاء (أقل من يومين)
          </Text>
          <AlertCircle size={12} color="#D97706" />
        </View>
      )}
    </Pressable>
  );
};

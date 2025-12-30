// src/screens/Dashboard/components/NextBookingCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, Clock, MapPin, User, ChevronLeft } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Bed icon
const BedIcon: React.FC<{ size?: number; color?: string }> = ({ 
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

// Pilates icon
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

interface Booking {
  reservationId: string;
  bedNumber: number;
  status: string;
  session: {
    id: string;
    title: string;
    startsAt: string;
    durationMin: number;
    instructorName?: string;
    locationName?: string;
  };
}

interface NextBookingCardProps {
  booking?: Booking | null;
  onViewAllPress?: () => void;
  onBookNowPress?: () => void;
}

const STATUS_BADGE: Record<string, { text: string; bg: string; textColor: string }> = {
  booked: { text: 'مؤكد', bg: '#E8F5E9', textColor: '#2E7D32' },
  attended: { text: 'حضرت', bg: '#E8F5E9', textColor: '#2E7D32' },
  canceled: { text: 'ملغي', bg: '#FFEBEE', textColor: '#C62828' },
};

export const NextBookingCard: React.FC<NextBookingCardProps> = ({
  booking,
  onViewAllPress,
  onBookNowPress,
}) => {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const badge = booking ? STATUS_BADGE[booking.status] || STATUS_BADGE.booked : null;

  return (
    <View
      className="bg-white rounded-2xl mx-5 p-4"
      style={{
        marginTop: -40,
        borderWidth: 1,
        borderColor: '#EDEDED',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity 
          onPress={onViewAllPress}
          className="flex-row items-center"
          activeOpacity={0.7}
        >
          <ChevronLeft size={16} color="#8b5cf6" />
          <Text className="text-sm text-purple-600 font-medium">عرض كل حجوزاتي</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">حجزك القادم</Text>
      </View>

      {booking ? (
        <>
          {/* Badge & Date */}
          <View className="flex-row items-start justify-between mb-3">
            {badge && (
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: badge.bg }}
              >
                <Text className="text-xs font-semibold" style={{ color: badge.textColor }}>
                  {badge.text}
                </Text>
              </View>
            )}
            <View className="items-end">
              <Text className="text-base font-semibold text-gray-900">
                {formatDate(booking.session.startsAt)}
              </Text>
              <Text className="text-sm text-gray-500">
                {formatTime(booking.session.startsAt)}
              </Text>
            </View>
          </View>

          {/* Details Box */}
          <View className="bg-gray-50 rounded-xl p-3">
            {/* Bed */}
            <View className="flex-row items-center justify-end mb-2">
              <Text className="text-sm text-gray-700 mr-2">
                سرير رقم {booking.bedNumber}
              </Text>
              <BedIcon size={16} color="#666666" />
            </View>

            {/* Class type */}
            <View className="flex-row items-center justify-end mb-2">
              <Text className="text-sm text-gray-700 mr-2">
                {booking.session.title || 'بيلاتس أجهزة'}
              </Text>
              <PilatesIcon size={16} color="#666666" />
            </View>

            {/* Instructor */}
            {booking.session.instructorName && (
              <View className="flex-row items-center justify-end mb-2">
                <Text className="text-sm text-gray-700 mr-2">
                  {booking.session.instructorName}
                </Text>
                <User size={16} color="#666666" />
              </View>
            )}

            {/* Location */}
            {booking.session.locationName && (
              <View className="flex-row items-center justify-end">
                <Text className="text-sm text-gray-700 mr-2">
                  {booking.session.locationName}
                </Text>
                <MapPin size={16} color="#666666" />
              </View>
            )}
          </View>
        </>
      ) : (
        /* Empty State */
        <View className="items-center py-6">
          <Calendar size={48} color="#D1D5DB" />
          <Text className="text-base text-gray-500 mt-3 mb-4">
            لا يوجد لديك أي حجز قادم
          </Text>
          <TouchableOpacity
            onPress={onBookNowPress}
            className="bg-purple-600 px-6 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">
              احجزي حصة الآن
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

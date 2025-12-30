import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { X, Clock, Calendar, User, MapPin, AlertTriangle } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simple bed icon
const BedIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = '#A68CD4' 
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

// Simple pilates icon
const PilatesIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = '#A68CD4' 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="14" width="20" height="3" rx="1.5" fill={color} opacity={0.3} />
    <Rect x="4" y="10" width="16" height="2" rx="1" fill={color} opacity={0.5} />
    <Circle cx="6" cy="17" r="2" fill={color} />
    <Circle cx="18" cy="17" r="2" fill={color} />
    <Path d="M8 8 L16 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export interface BookingDetails {
  reservationId: string;
  dayName: string;
  dateLabel: string;
  timeRange: string;
  bedNumber: number;
  sessionType: string;
  instructorName?: string;
  locationName?: string;
  canCancel: boolean;
  isUpcoming: boolean;
}

interface BookingDetailsModalProps {
  visible: boolean;
  booking: BookingDetails | null;
  onClose: () => void;
  onCancelPress: () => void;
}

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
    <Text className="text-base text-gray-900 flex-1 text-left font-medium">
      {value}
    </Text>
    <View className="flex-row items-center">
      <Text className="text-sm text-gray-500 mr-2">{label}</Text>
      {icon}
    </View>
  </View>
);

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  visible,
  booking,
  onClose,
  onCancelPress,
}) => {
  const insets = useSafeAreaInsets();

  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
          <View className="w-10" />
          <Text className="text-lg font-bold text-gray-900">تفاصيل الحجز</Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <X size={20} color="#666666" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Date Header */}
          <View className="items-center py-6">
            <Text className="text-2xl font-bold text-primary mb-1">
              {booking.dayName}
            </Text>
            <Text className="text-base text-gray-500">
              {booking.dateLabel}
            </Text>
          </View>

          {/* Details Card */}
          <View 
            className="bg-white rounded-2xl p-4 mb-6"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <DetailRow
              icon={<Clock size={20} color="#A68CD4" />}
              label="الوقت"
              value={booking.timeRange}
            />
            <DetailRow
              icon={<BedIcon size={20} color="#A68CD4" />}
              label="رقم السرير"
              value={`سرير ${booking.bedNumber}`}
            />
            <DetailRow
              icon={<PilatesIcon size={20} color="#A68CD4" />}
              label="نوع الحصة"
              value={booking.sessionType}
            />
            {booking.instructorName && (
              <DetailRow
                icon={<User size={20} color="#A68CD4" />}
                label="المدربة"
                value={booking.instructorName}
              />
            )}
            {booking.locationName && (
              <DetailRow
                icon={<MapPin size={20} color="#A68CD4" />}
                label="الموقع"
                value={booking.locationName}
              />
            )}
          </View>

          {/* Cancellation Policy */}
          {booking.isUpcoming && (
            <View 
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: '#FFF8E1' }}
            >
              <View className="flex-row items-start justify-end">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-amber-800 text-right mb-1">
                    سياسة الإلغاء
                  </Text>
                  <Text className="text-xs text-amber-700 text-right leading-5">
                    يمكنك إلغاء الحجز قبل 48 ساعة على الأقل من موعد الحصة.
                    الإلغاء بعد هذه المدة غير متاح.
                  </Text>
                </View>
                <AlertTriangle size={20} color="#F59E0B" />
              </View>
            </View>
          )}

          {/* Cancel Button - Only for upcoming bookings */}
          {booking.isUpcoming && (
            <Pressable
              onPress={booking.canCancel ? onCancelPress : undefined}
              disabled={!booking.canCancel}
              className={`py-4 rounded-xl items-center ${
                booking.canCancel 
                  ? 'bg-red-500 active:bg-red-600' 
                  : 'bg-gray-200'
              }`}
            >
              <Text 
                className={`text-base font-semibold ${
                  booking.canCancel ? 'text-white' : 'text-gray-400'
                }`}
              >
                إلغاء الحجز
              </Text>
            </Pressable>
          )}

          {/* Cannot cancel message */}
          {booking.isUpcoming && !booking.canCancel && (
            <Text className="text-xs text-gray-500 text-center mt-3">
              لا يمكن الإلغاء لأن الحجز أقل من يومين
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

import React from 'react';
import { View, Text } from 'react-native';
import { Calendar, Clock, User } from 'lucide-react-native';
import { BedIcon } from '../../../components/icons/BedIcon';

interface BookingSummaryCardProps {
  dayName: string;
  dateLabel: string;
  timeRange: string;
  sessionType: string;
  instructorName: string;
  bedNumber: number;
}

const SummaryRow: React.FC<{
  icon?: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}> = ({ icon, label, value, isLast }) => (
  <View className={`flex-row justify-between items-center py-3 ${!isLast ? 'border-b border-border' : ''}`}>
    {/* Value on left (RTL: appears on left side) */}
    <Text className="text-sm font-medium text-foreground flex-1 text-left">
      {value}
    </Text>
    
    {/* Label + Icon on right */}
    <View className="flex-row items-center">
      <Text className="text-sm text-muted-foreground ml-2">
        {label}
      </Text>
      {icon}
    </View>
  </View>
);

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  dayName,
  dateLabel,
  timeRange,
  sessionType,
  instructorName,
  bedNumber,
}) => {
  return (
    <View 
      className="bg-white rounded-2xl p-5 mb-4"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Card Header */}
      <View className="mb-4">
        <Text className="text-xl font-bold text-primary text-right mb-1">
          ملخص الحجز
        </Text>
        <Text className="text-sm text-muted-foreground text-right">
          الرجاء مراجعة التفاصيل قبل التأكيد
        </Text>
      </View>

      {/* Summary Rows */}
      <SummaryRow
        icon={<Calendar size={22} color="#A68CD4" />}
        label="اليوم"
        value={dayName}
      />
      
      <SummaryRow
        icon={<Calendar size={22} color="#A68CD4" />}
        label="التاريخ"
        value={dateLabel}
      />
      
      <SummaryRow
        icon={<Clock size={22} color="#A68CD4" />}
        label="الوقت"
        value={timeRange}
      />
      
      <SummaryRow
        label="نوع الحصة"
        value={sessionType}
      />
      
      <SummaryRow
        icon={<User size={22} color="#A68CD4" />}
        label="المدربة"
        value={instructorName}
      />
      
      {/* Bed Row with custom icon - use image directly */}
      <View className="flex-row justify-between items-center py-3">
        <Text className="text-sm font-medium text-foreground flex-1 text-left">
          سرير {bedNumber}
        </Text>
        
        <View className="flex-row items-center">
          <Text className="text-sm text-muted-foreground ml-2">
            رقم السرير
          </Text>
          <BedIcon size={24} />
        </View>
      </View>
    </View>
  );
};

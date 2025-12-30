// src/screens/Subscription/components/SubscriptionDetailsCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react-native';

type SubscriptionStatus = 'pending' | 'active' | 'rejected' | 'cancelled' | 'expired' | 'expiring_soon';

interface SubscriptionDetailsCardProps {
  planName: string;
  monthlyLimit: number; // 4 or 8 sessions per month
  status: SubscriptionStatus;
  startDate?: string;
  endDate?: string;
  price?: string;
}

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  active: {
    label: 'نشط',
    color: '#16a34a',
    bgColor: 'bg-green-100',
    icon: <CheckCircle size={16} color="#16a34a" />,
  },
  pending: {
    label: 'قيد المراجعة',
    color: '#ca8a04',
    bgColor: 'bg-yellow-100',
    icon: <Clock size={16} color="#ca8a04" />,
  },
  expiring_soon: {
    label: 'ينتهي قريباً',
    color: '#ea580c',
    bgColor: 'bg-orange-100',
    icon: <AlertCircle size={16} color="#ea580c" />,
  },
  expired: {
    label: 'منتهي',
    color: '#6b7280',
    bgColor: 'bg-gray-100',
    icon: <XCircle size={16} color="#6b7280" />,
  },
  rejected: {
    label: 'مرفوض',
    color: '#dc2626',
    bgColor: 'bg-red-100',
    icon: <XCircle size={16} color="#dc2626" />,
  },
  cancelled: {
    label: 'ملغي',
    color: '#6b7280',
    bgColor: 'bg-gray-100',
    icon: <XCircle size={16} color="#6b7280" />,
  },
};

const MONTHLY_LIMIT_LABELS: Record<number, string> = {
  4: '4 جلسات في الشهر',
  8: '8 جلسات في الشهر',
};

export const SubscriptionDetailsCard: React.FC<SubscriptionDetailsCardProps> = ({
  planName,
  monthlyLimit,
  status,
  startDate,
  endDate,
  price,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const monthlyLabel = MONTHLY_LIMIT_LABELS[monthlyLimit] || `${monthlyLimit} جلسات في الشهر`;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-purple-100 shadow-sm">
      {/* Header with status badge */}
      <View className="flex-row-reverse items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-900">تفاصيل الاشتراك</Text>
        <View className={`flex-row items-center px-3 py-1 rounded-full ${config.bgColor}`}>
          {config.icon}
          <Text className="text-sm font-medium mr-1" style={{ color: config.color }}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Plan info */}
      <View className="mb-4">
        <Text className="text-base font-semibold text-gray-900 text-right mb-1">
          {planName}
        </Text>
        <Text className="text-sm text-gray-500 text-right">
          {monthlyLabel}
        </Text>
      </View>

      {/* Dates */}
      {(startDate || endDate) && (
        <View className="border-t border-gray-100 pt-3">
          {startDate && (
            <View className="flex-row-reverse justify-between items-center mb-2">
              <Text className="text-sm text-gray-500">تاريخ البدء:</Text>
              <Text className="text-sm text-gray-900">{formatDate(startDate)}</Text>
            </View>
          )}
          {endDate && (
            <View className="flex-row-reverse justify-between items-center">
              <Text className="text-sm text-gray-500">تاريخ الانتهاء:</Text>
              <Text className="text-sm text-gray-900">{formatDate(endDate)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Price if provided */}
      {price && (
        <View className="border-t border-gray-100 pt-3 mt-3">
          <View className="flex-row-reverse justify-between items-center">
            <Text className="text-sm text-gray-500">السعر الشهري:</Text>
            <Text className="text-lg font-bold text-purple-600">{price}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

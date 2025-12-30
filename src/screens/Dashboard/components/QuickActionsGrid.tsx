// src/screens/Dashboard/components/QuickActionsGrid.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, List, CreditCard } from 'lucide-react-native';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

interface QuickActionsGridProps {
  onBookSession: () => void;
  onViewBookings: () => void;
  onViewSubscription: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onBookSession,
  onViewBookings,
  onViewSubscription,
}) => {
  const actions: QuickAction[] = [
    {
      id: 'book',
      label: 'حجز حصة جديدة',
      icon: <Calendar size={28} color="#8b5cf6" />,
      onPress: onBookSession,
    },
    {
      id: 'bookings',
      label: 'حجوزاتي',
      icon: <List size={28} color="#8b5cf6" />,
      onPress: onViewBookings,
    },
    {
      id: 'subscription',
      label: 'اشتراكي',
      icon: <CreditCard size={28} color="#8b5cf6" />,
      onPress: onViewSubscription,
    },
  ];

  return (
    <View className="px-5 mt-5">
      <View className="flex-row justify-between">
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={action.onPress}
            className="flex-1 mx-1.5 bg-white rounded-2xl p-4 items-center"
            activeOpacity={0.7}
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
            <View className="w-14 h-14 rounded-full bg-purple-50 items-center justify-center mb-2">
              {action.icon}
            </View>
            <Text className="text-xs font-medium text-gray-700 text-center">
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// src/screens/AdminScheduleSettings/components/DeleteDayAlert.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface DeleteDayAlertProps {
  visible: boolean;
  dayName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteDayAlert: React.FC<DeleteDayAlertProps> = ({
  visible,
  dayName,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-5">
        <View className="bg-white rounded-2xl p-5 w-full max-w-sm">
          {/* Icon */}
          <View className="w-14 h-14 rounded-full bg-amber-100 items-center justify-center self-center mb-4">
            <AlertTriangle size={28} color="#F59E0B" />
          </View>

          {/* Title */}
          <Text className="text-lg font-bold text-gray-900 text-center mb-2">
            إلغاء يوم {dayName}
          </Text>

          {/* Message */}
          <Text className="text-gray-600 text-center mb-5">
            سيتم إلغاء تفعيل هذا اليوم وحذف جميع فترات العمل المحددة له. هل تريد المتابعة؟
          </Text>

          {/* Actions */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-100 py-3 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold text-center">إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="flex-1 bg-amber-500 py-3 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-center">تأكيد</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

import React from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface CancelConfirmationModalProps {
  visible: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CancelConfirmationModal: React.FC<CancelConfirmationModalProps> = ({
  visible,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <Pressable 
        className="flex-1 bg-black/50 justify-center items-center px-6"
        onPress={onCancel}
      >
        <Pressable 
          className="bg-white rounded-2xl p-6 w-full max-w-sm"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View className="items-center mb-4">
            <View 
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <AlertTriangle size={32} color="#EF4444" />
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            تأكيد الإلغاء
          </Text>

          {/* Message */}
          <Text className="text-base text-gray-600 text-center mb-6 leading-6">
            هل أنت متأكدة من إلغاء هذا الحجز؟{'\n'}
            لا يمكن التراجع عن هذا الإجراء.
          </Text>

          {/* Buttons */}
          <View className="flex-row gap-3">
            {/* Back Button */}
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl border border-gray-200 items-center active:bg-gray-50"
            >
              <Text className="text-base font-semibold text-gray-700">
                رجوع
              </Text>
            </Pressable>

            {/* Confirm Button */}
            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-red-500 items-center active:bg-red-600"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  تأكيد الإلغاء
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

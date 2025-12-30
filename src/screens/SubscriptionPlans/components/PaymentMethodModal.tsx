// src/screens/SubscriptionPlans/components/PaymentMethodModal.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { X, Banknote, Building2, CheckCircle } from 'lucide-react-native';

type PaymentMethod = 'cash' | 'bank_transfer';
type RequestedAction = 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, proofUrl?: string) => void;
  isLoading?: boolean;
  planName?: string;
  planPrice?: number;
  requestedAction?: RequestedAction;
}

const ACTION_TITLES: Record<RequestedAction, string> = {
  renew: 'تمديد الاشتراك',
  upgrade_current_month: 'ترقية الشهر الحالي',
  upgrade_next_month: 'ترقية للشهر القادم',
  downgrade_next_month: 'تخفيض للشهر القادم',
};

const ACTION_BUTTON_LABELS: Record<RequestedAction, string> = {
  renew: 'تأكيد التمديد',
  upgrade_current_month: 'تأكيد الترقية',
  upgrade_next_month: 'تأكيد الترقية',
  downgrade_next_month: 'تأكيد التخفيض',
};

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  planName,
  planPrice,
  requestedAction = 'upgrade_next_month',
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const handleConfirm = () => {
    if (selectedMethod) {
      onConfirm(selectedMethod);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedMethod(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center px-6"
        onPress={handleClose}
      >
        <Pressable
          className="bg-white rounded-2xl w-full max-w-sm p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row-reverse items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">{ACTION_TITLES[requestedAction]}</Text>
            <TouchableOpacity onPress={handleClose} className="p-1" disabled={isLoading}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {planName && (
            <Text className="text-sm text-gray-500 text-right mb-2">
              الباقة المختارة: {planName}
            </Text>
          )}

          {planPrice !== undefined && (
            <Text className="text-lg font-bold text-purple-700 text-right mb-4">
              المبلغ: ₪{planPrice}
            </Text>
          )}

          <Text className="text-sm text-gray-500 text-right mb-6">
            اختر طريقة الدفع المفضلة لديك
          </Text>

          {/* Payment options */}
          <View className="gap-3 mb-6">
            <TouchableOpacity
              onPress={() => setSelectedMethod('cash')}
              className={`rounded-xl py-4 px-4 flex-row-reverse items-center border-2 ${
                selectedMethod === 'cash' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
              }`}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <View
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  selectedMethod === 'cash' ? 'bg-purple-100' : 'bg-gray-100'
                }`}
              >
                <Banknote size={24} color={selectedMethod === 'cash' ? '#8b5cf6' : '#6b7280'} />
              </View>
              <View className="flex-1 mr-3">
                <Text
                  className={`text-base font-medium text-right ${
                    selectedMethod === 'cash' ? 'text-purple-900' : 'text-gray-900'
                  }`}
                >
                  كاش
                </Text>
                <Text className="text-sm text-gray-500 text-right">الدفع نقداً في الاستوديو</Text>
              </View>
              {selectedMethod === 'cash' && <CheckCircle size={24} color="#8b5cf6" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedMethod('bank_transfer')}
              className={`rounded-xl py-4 px-4 flex-row-reverse items-center border-2 ${
                selectedMethod === 'bank_transfer' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
              }`}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <View
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  selectedMethod === 'bank_transfer' ? 'bg-purple-100' : 'bg-gray-100'
                }`}
              >
                <Building2 size={24} color={selectedMethod === 'bank_transfer' ? '#8b5cf6' : '#6b7280'} />
              </View>
              <View className="flex-1 mr-3">
                <Text
                  className={`text-base font-medium text-right ${
                    selectedMethod === 'bank_transfer' ? 'text-purple-900' : 'text-gray-900'
                  }`}
                >
                  تحويل بنكي
                </Text>
                <Text className="text-sm text-gray-500 text-right">التحويل إلى حسابنا البنكي</Text>
              </View>
              {selectedMethod === 'bank_transfer' && <CheckCircle size={24} color="#8b5cf6" />}
            </TouchableOpacity>
          </View>

          {/* Upgrade current month disclaimer */}
          {requestedAction === 'upgrade_current_month' && (
            <View className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
              <Text className="text-xs text-yellow-800 text-right">
                هذا مبلغ تقديري وقد يتم تعديله بعد مراجعة الإدارة
              </Text>
            </View>
          )}

          {/* Bank transfer proof notice */}
          {selectedMethod === 'bank_transfer' && (
            <View className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
              <Text className="text-xs text-blue-800 text-right">
                يرجى إرفاق إثبات التحويل البنكي بعد إتمام التحويل
              </Text>
            </View>
          )}

          {/* Confirm button */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!selectedMethod || isLoading}
            className={`rounded-xl py-4 ${
              selectedMethod && !isLoading ? 'bg-purple-600' : 'bg-gray-300'
            }`}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-center text-base">
                {ACTION_BUTTON_LABELS[requestedAction]}
              </Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-gray-400 text-center mt-3">
            سيتم تفعيل اشتراكك بعد تأكيد الدفع من قبل الإدارة
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

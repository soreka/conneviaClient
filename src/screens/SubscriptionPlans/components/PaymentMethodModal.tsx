// src/screens/SubscriptionPlans/components/PaymentMethodModal.tsx
//
// C-STORE-01 / C-UX-01 / C-STORE-04 (2026-06-03 payment-rework):
// The customer subscription flow is a NEUTRAL OUT-OF-BAND REQUEST, not an
// in-app checkout. Per Apple Guideline 3.1.1 we must not display payment
// method choices, bank-transfer instructions, proof-of-transfer copy, an
// "amount to pay" line, or "confirm payment" wording. The studio arranges
// payment with the customer separately (WhatsApp / in person).
//
// The file name is retained to avoid import churn across the screen and
// components/index.ts. Renaming is optional and out of scope.
import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';

type RequestedAction = 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  // The reworked flow does NOT collect a method or a proof. The handler
  // signature accepts no args so the screen's createPayment(...) call site
  // can drop method/proofUrl from the mutation body.
  onConfirm: () => void;
  isLoading?: boolean;
  planName?: string;
  planPrice?: number;
  requestedAction?: RequestedAction;
}

const ACTION_TITLES: Record<RequestedAction, string> = {
  renew: 'تمديد الاشتراك',
  upgrade_current_month: 'ترقية الباقة',
  upgrade_next_month: 'ترقية للشهر القادم',
  downgrade_next_month: 'تخفيض للشهر القادم',
};

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  planName,
  requestedAction = 'upgrade_next_month',
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    if (!isLoading) {
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
          {/* Header — neutral request title, not a checkout title */}
          <View className="flex-row-reverse items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">اطلبي هذه الباقة</Text>
            <TouchableOpacity onPress={handleClose} className="p-1" disabled={isLoading}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {planName && (
            <Text className="text-sm text-gray-500 text-right mb-2">
              الباقة المختارة: {planName}
            </Text>
          )}

          {/* Subtitle: clarify the action without payment wording */}
          <Text className="text-sm text-gray-500 text-right mb-6">
            {ACTION_TITLES[requestedAction]}
          </Text>

          {/* Neutral body — the studio handles the rest out of band. No
              method picker, no "amount", no transfer instructions, no
              proof-attach notice. */}
          <View className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
            <Text className="text-sm text-gray-700 text-right leading-6">
              ستتواصل معك الإدارة لإتمام الاشتراك.
            </Text>
          </View>

          {/* Single neutral confirm button */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isLoading}
            className={`rounded-xl py-4 ${isLoading ? 'bg-gray-300' : 'bg-purple-600'}`}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-center text-base">
                تأكيد الطلب
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

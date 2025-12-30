// src/screens/Admin/components/ConfirmCancelSessionModal.tsx
// Role: Destructive confirmation modal for cancelling a session
import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

interface ConfirmCancelSessionModalProps {
  visible: boolean;
  sessionTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmCancelSessionModal: React.FC<ConfirmCancelSessionModalProps> = ({
  visible,
  sessionTitle,
  onClose,
  onConfirm,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 340,
          }}
        >
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: '#fef2f2',
                borderRadius: 50,
                padding: 16,
              }}
            >
              <AlertTriangle size={32} color="#dc2626" />
            </View>
          </View>

          {/* Title */}
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 8 }}>
            إلغاء الحصة
          </Text>

          {/* Message */}
          <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 8, lineHeight: 22 }}>
            هل أنتِ متأكدة من إلغاء حصة
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', textAlign: 'center', marginBottom: 24 }}>
            "{sessionTitle}"؟
          </Text>

          <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 24 }}>
            سيتم إشعار جميع المشتركات بإلغاء الحصة
          </Text>

          {/* Actions */}
          <Pressable
            onPress={onConfirm}
            style={{
              backgroundColor: '#dc2626',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
              نعم، إلغاء الحصة
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>
              تراجع
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmCancelSessionModal;

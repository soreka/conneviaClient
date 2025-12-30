// src/screens/Admin/components/EditBookingModal.tsx
// Role: Modal for editing a booking (customer name, phone)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';

interface Booking {
  id: string;
  customerName: string;
  phone: string;
}

interface EditBookingModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSave: (booking: Booking) => void;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  visible,
  booking,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customerName);
      setPhone(booking.phone);
    }
  }, [booking]);

  const handleSave = () => {
    if (booking && customerName.trim() && phone.trim()) {
      onSave({
        ...booking,
        customerName: customerName.trim(),
        phone: phone.trim(),
      });
    }
  };

  if (!visible || !booking) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>
                تعديل الحجز
              </Text>
              <Pressable onPress={onClose} style={{ padding: 8 }}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
                اسم العميلة
              </Text>
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="أدخلي اسم العميلة"
                placeholderTextColor="#9ca3af"
                style={{
                  backgroundColor: '#f9fafb',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: '#1f2937',
                  textAlign: 'right',
                }}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
                رقم الجوال
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="05xxxxxxxx"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                style={{
                  backgroundColor: '#f9fafb',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: '#1f2937',
                  textAlign: 'right',
                }}
              />
            </View>

            {/* Actions */}
            <Pressable
              onPress={handleSave}
              style={{
                backgroundColor: '#8b5cf6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                حفظ التعديلات
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
                إلغاء
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditBookingModal;

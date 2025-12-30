// src/screens/Admin/components/AddBookingModal.tsx
// Role: Modal for adding a booking manually (customer name, phone, bed number)
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, UserPlus } from 'lucide-react-native';

interface AddBookingModalProps {
  visible: boolean;
  sessionTitle: string;
  capacity: number;
  bookedBeds: number[]; // Array of bed numbers already booked
  onClose: () => void;
  onAdd: (customerName: string, phone: string, bedNumber: number) => void;
}

export const AddBookingModal: React.FC<AddBookingModalProps> = ({
  visible,
  sessionTitle,
  capacity,
  bookedBeds,
  onClose,
  onAdd,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBed, setSelectedBed] = useState<number | null>(null);

  // Generate array of bed numbers 1..capacity
  const beds = useMemo(() => 
    Array.from({ length: capacity }, (_, i) => i + 1),
    [capacity]
  );

  const handleAdd = () => {
    if (customerName.trim() && selectedBed) {
      onAdd(customerName.trim(), phone.trim(), selectedBed);
      setCustomerName('');
      setPhone('');
      setSelectedBed(null);
    }
  };

  const handleClose = () => {
    setCustomerName('');
    setPhone('');
    setSelectedBed(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
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
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                <UserPlus size={22} color="#8b5cf6" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937', marginRight: 8 }}>
                  إضافة زبونة يدويًا
                </Text>
              </View>
              <Pressable onPress={handleClose} style={{ padding: 8 }}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'right', marginBottom: 24 }}>
              {sessionTitle}
            </Text>

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

            <View style={{ marginBottom: 16 }}>
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

            {/* Bed Selection */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
                رقم السرير
              </Text>
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                {beds.map((bedNum) => {
                  const isBooked = bookedBeds.includes(bedNum);
                  const isSelected = selectedBed === bedNum;
                  
                  return (
                    <Pressable
                      key={bedNum}
                      onPress={() => !isBooked && setSelectedBed(bedNum)}
                      disabled={isBooked}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isBooked 
                          ? '#f3f4f6' 
                          : isSelected 
                            ? '#8b5cf6' 
                            : '#ffffff',
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: isBooked ? '#e5e7eb' : '#d1d5db',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: isBooked 
                            ? '#9ca3af' 
                            : isSelected 
                              ? '#ffffff' 
                              : '#374151',
                        }}
                      >
                        {bedNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!selectedBed && (
                <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 8 }}>
                  اختاري رقم السرير المتاح
                </Text>
              )}
            </View>

            {/* Actions */}
            <Pressable
              onPress={handleAdd}
              disabled={!customerName.trim() || !selectedBed}
              style={{
                backgroundColor: (!customerName.trim() || !selectedBed) ? '#d1d5db' : '#8b5cf6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                إضافة الحجز
              </Text>
            </Pressable>

            <Pressable
              onPress={handleClose}
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

export default AddBookingModal;

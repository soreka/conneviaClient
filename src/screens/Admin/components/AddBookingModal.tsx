// src/screens/Admin/components/AddBookingModal.tsx
// Role: Modal for adding a booking manually or selecting existing customer
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, UserPlus, UserCheck, Edit3 } from 'lucide-react-native';
import { CustomerSearchInput } from './CustomerSearchInput';
import { useAdminAddCustomerToSessionMutation } from '../../../features/api/apiSlice';

interface SelectedCustomer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface AddBookingModalProps {
  visible: boolean;
  sessionId: string;
  sessionTitle: string;
  capacity: number;
  bookedBeds: number[]; // Array of bed numbers already booked
  onClose: () => void;
  onAdd: (customerName: string, phone: string, bedNumber: number) => void;
  onCustomerAdded?: () => void; // Called when existing customer is added
}

export const AddBookingModal: React.FC<AddBookingModalProps> = ({
  visible,
  sessionId,
  sessionTitle,
  capacity,
  bookedBeds,
  onClose,
  onAdd,
  onCustomerAdded,
}) => {
  // Mode: 'search' = search existing customer, 'manual' = enter manually
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBed, setSelectedBed] = useState<number | null>(null);

  const [addCustomerToSession, { isLoading: isAddingCustomer }] = useAdminAddCustomerToSessionMutation();

  // Generate array of bed numbers 1..capacity
  const beds = useMemo(() => 
    Array.from({ length: capacity }, (_, i) => i + 1),
    [capacity]
  );

  // Handle manual add (existing flow)
  const handleManualAdd = () => {
    if (customerName.trim() && selectedBed) {
      onAdd(customerName.trim(), phone.trim(), selectedBed);
      resetAndClose();
    }
  };

  // Handle adding existing customer
  const handleAddExistingCustomer = useCallback(async () => {
    if (!selectedCustomer) return;

    try {
      const result = await addCustomerToSession({
        sessionId,
        customerId: selectedCustomer.id,
      }).unwrap();

      if (result.alreadyBooked) {
        Alert.alert('تنبيه', 'هذه العميلة مسجلة بالفعل في هذه الجلسة');
      } else {
        Alert.alert('تم', `تمت إضافة ${selectedCustomer.fullName} بنجاح`);
      }

      onCustomerAdded?.();
      resetAndClose();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error || 'فشل في إضافة العميلة');
    }
  }, [selectedCustomer, sessionId, addCustomerToSession, onCustomerAdded]);

  // Handle customer selection from search
  const handleSelectCustomer = useCallback((customer: SelectedCustomer) => {
    setSelectedCustomer(customer);
  }, []);

  // Clear selected customer
  const handleClearSelection = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  // Reset state and close
  const resetAndClose = () => {
    setMode('search');
    setSelectedCustomer(null);
    setCustomerName('');
    setPhone('');
    setSelectedBed(null);
    onClose();
  };

  const handleClose = () => {
    resetAndClose();
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
                  إضافة زبونة
                </Text>
              </View>
              <Pressable onPress={handleClose} style={{ padding: 8 }}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'right', marginBottom: 16 }}>
              {sessionTitle}
            </Text>

            {/* Mode Toggle */}
            <View style={{ flexDirection: 'row-reverse', marginBottom: 20, gap: 8 }}>
              <Pressable
                onPress={() => { setMode('search'); setSelectedCustomer(null); }}
                style={{
                  flex: 1,
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: mode === 'search' ? '#8b5cf6' : '#f3f4f6',
                }}
              >
                <UserCheck size={16} color={mode === 'search' ? '#fff' : '#6b7280'} />
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: mode === 'search' ? '#fff' : '#6b7280',
                  marginRight: 6,
                }}>
                  بحث عميلة
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setMode('manual'); setSelectedCustomer(null); }}
                style={{
                  flex: 1,
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: mode === 'manual' ? '#8b5cf6' : '#f3f4f6',
                }}
              >
                <Edit3 size={16} color={mode === 'manual' ? '#fff' : '#6b7280'} />
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: mode === 'manual' ? '#fff' : '#6b7280',
                  marginRight: 6,
                }}>
                  إدخال يدوي
                </Text>
              </Pressable>
            </View>

            {/* Search Mode */}
            {mode === 'search' && (
              <View style={{ marginBottom: 20 }}>
                {selectedCustomer ? (
                  // Show selected customer
                  <View
                    style={{
                      backgroundColor: '#f3e8ff',
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#8b5cf6',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 12,
                      }}
                    >
                      <UserCheck size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f2937', textAlign: 'right' }}>
                        {selectedCustomer.fullName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 2 }}>
                        {selectedCustomer.email}
                      </Text>
                    </View>
                    <Pressable onPress={handleClearSelection} style={{ padding: 8 }}>
                      <X size={18} color="#8b5cf6" />
                    </Pressable>
                  </View>
                ) : (
                  // Show search input
                  <CustomerSearchInput
                    onSelectCustomer={handleSelectCustomer}
                    placeholder="ابحثي بالاسم أو الإيميل أو الجوال..."
                  />
                )}
              </View>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
              <>
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

                {/* Bed Selection - Only for manual mode */}
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
              </>
            )}

            {/* Actions */}
            {mode === 'search' ? (
              <Pressable
                onPress={handleAddExistingCustomer}
                disabled={!selectedCustomer || isAddingCustomer}
                style={{
                  backgroundColor: (!selectedCustomer || isAddingCustomer) ? '#d1d5db' : '#8b5cf6',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                {isAddingCustomer ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                    إضافة العميلة للجلسة
                  </Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={handleManualAdd}
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
            )}

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

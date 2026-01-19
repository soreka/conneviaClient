// src/screens/Admin/components/AddBookingModal.tsx
// Role: Modal for adding an existing customer to a session via search
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ToastAndroid,
  Alert,
} from 'react-native';
import { X, UserPlus, UserCheck } from 'lucide-react-native';
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
  onClose: () => void;
  onCustomerAdded?: () => void; // Called when customer is added
}

// Helper to show toast cross-platform
const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // iOS doesn't have ToastAndroid, use Alert as fallback
    Alert.alert('', message);
  }
};

export const AddBookingModal: React.FC<AddBookingModalProps> = ({
  visible,
  sessionId,
  sessionTitle,
  onClose,
  onCustomerAdded,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);

  const [addCustomerToSession, { isLoading: isAddingCustomer }] = useAdminAddCustomerToSessionMutation();

  // Handle adding customer to session
  const handleAddCustomer = useCallback(async () => {
    if (!selectedCustomer) return;

    try {
      const result = await addCustomerToSession({
        sessionId,
        customerId: selectedCustomer.id,
      }).unwrap();

      if (result.alreadyBooked) {
        Alert.alert('تنبيه', 'هذه العميلة مسجلة بالفعل في هذه الجلسة');
      } else {
        showToast('تمت الإضافة بنجاح');
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
    setSelectedCustomer(null);
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

            {/* Customer Search */}
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
                // Show search input with helper text
                <>
                  <CustomerSearchInput
                    onSelectCustomer={handleSelectCustomer}
                    placeholder="ابحثي بالاسم..."
                  />
                  <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 8 }}>
                    اختاري زبونة من القائمة
                  </Text>
                </>
              )}
            </View>

            {/* Add Button */}
            <Pressable
              onPress={handleAddCustomer}
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

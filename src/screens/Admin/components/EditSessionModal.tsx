// src/screens/Admin/components/EditSessionModal.tsx
// Role: Modal for editing session details (title, type, capacity, time)
import React, { useState, useEffect } from 'react';
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
import { X, Edit3 } from 'lucide-react-native';

interface Session {
  id: string;
  title: string;
  type: string;
  capacity: number;
  startsAt: string;
  durationMin: number;
  bookedCount?: number;
  bookings?: { id: string; customerName: string; phone: string }[];
}

interface EditSessionModalProps {
  visible: boolean;
  session: Session | null;
  onClose: () => void;
  onSave: (session: Session) => void;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  visible,
  session,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [durationMin, setDurationMin] = useState('');

  useEffect(() => {
    if (session) {
      setTitle(session.title);
      setType(session.type);
      setCapacity(String(session.capacity));
      setDurationMin(String(session.durationMin));
    }
  }, [session]);

  const handleSave = () => {
    if (session && title.trim() && type.trim() && capacity && durationMin) {
      onSave({
        ...session,
        title: title.trim(),
        type: type.trim(),
        capacity: parseInt(capacity, 10) || session.capacity,
        durationMin: parseInt(durationMin, 10) || session.durationMin,
      });
    }
  };

  if (!visible || !session) return null;

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
              maxHeight: '85%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                <Edit3 size={22} color="#8b5cf6" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937', marginRight: 8 }}>
                  تعديل بيانات الحصة
                </Text>
              </View>
              <Pressable onPress={onClose} style={{ padding: 8 }}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Title */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
                  اسم الحصة
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="أدخلي اسم الحصة"
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

              {/* Type */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
                  نوع الحصة
                </Text>
                <TextInput
                  value={type}
                  onChangeText={setType}
                  placeholder="مثال: يوغا، بيلاتس"
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

              {/* Capacity */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
                  السعة (عدد الأسرة)
                </Text>
                <TextInput
                  value={capacity}
                  onChangeText={setCapacity}
                  placeholder="مثال: 10"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
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

              {/* Duration */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
                  مدة الحصة (بالدقائق)
                </Text>
                <TextInput
                  value={durationMin}
                  onChangeText={setDurationMin}
                  placeholder="مثال: 60"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
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
                  marginBottom: 40,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>
                  إلغاء
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditSessionModal;

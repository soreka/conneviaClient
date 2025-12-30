// src/screens/Admin/components/AddSessionModal.tsx
// Role: Modal for adding a new session with form fields matching Lovable design
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Clock, ChevronDown } from 'lucide-react-native';

// Session type options
const SESSION_TYPES = [
  'بيلاتس أجهزة',
  'بيلاتس مات',
  'يوغا صباحية',
  'تمارين القوة',
];

// Day options - Sunday first
const DAY_OPTIONS = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الإثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
];

// Capacity options 1-12
const CAPACITY_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export interface NewSession {
  type: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
  capacity: number;
}

interface AddSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (session: NewSession) => void;
}

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [sessionType, setSessionType] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState<number | null>(null);
  const [timeError, setTimeError] = useState('');

  // Dropdown open states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [capacityDropdownOpen, setCapacityDropdownOpen] = useState(false);

  const resetForm = () => {
    setSessionType('');
    setSelectedDay(null);
    setStartTime('');
    setEndTime('');
    setCapacity(null);
    setTimeError('');
    setTypeDropdownOpen(false);
    setDayDropdownOpen(false);
    setCapacityDropdownOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateTime = (start: string, end: string): boolean => {
    if (!start || !end) return true;
    
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return true;
    }
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return endMinutes > startMinutes;
  };

  const handleStartTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    setStartTime(formatted);
    if (endTime && formatted) {
      if (!validateTime(formatted, endTime)) {
        setTimeError('وقت النهاية يجب أن يكون بعد وقت البداية');
      } else {
        setTimeError('');
      }
    }
  };

  const handleEndTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    setEndTime(formatted);
    if (startTime && formatted) {
      if (!validateTime(startTime, formatted)) {
        setTimeError('وقت النهاية يجب أن يكون بعد وقت البداية');
      } else {
        setTimeError('');
      }
    }
  };

  const formatTimeInput = (text: string): string => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  };

  const isFormValid = (): boolean => {
    return (
      sessionType !== '' &&
      selectedDay !== null &&
      startTime.length === 5 &&
      endTime.length === 5 &&
      capacity !== null &&
      validateTime(startTime, endTime)
    );
  };

  const handleSubmit = () => {
    if (!isFormValid()) return;

    onSubmit({
      type: sessionType,
      dayIndex: selectedDay!,
      startTime,
      endTime,
      capacity: capacity!,
    });
    resetForm();
  };

  if (!visible) return null;

  const renderSelect = (
    label: string,
    value: string,
    isOpen: boolean,
    onToggle: () => void,
    options: { label: string; onSelect: () => void }[]
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
        {label}
      </Text>
      <Pressable
        onPress={onToggle}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: isOpen ? '#8b5cf6' : '#e5e7eb',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Text style={{ fontSize: 15, color: value ? '#1f2937' : '#9ca3af', textAlign: 'right' }}>
          {value || 'اختر...'}
        </Text>
        <ChevronDown size={20} color="#6b7280" />
      </Pressable>
      {isOpen && (
        <View
          style={{
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            marginTop: 4,
            overflow: 'hidden',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          {options.map((option, index) => (
            <Pressable
              key={index}
              onPress={option.onSelect}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: index < options.length - 1 ? 1 : 0,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <Text style={{ fontSize: 15, color: '#1f2937', textAlign: 'right' }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const renderTimeInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string
  ) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Clock size={18} color="#6b7280" style={{ marginLeft: 8 }} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          maxLength={5}
          style={{
            flex: 1,
            fontSize: 15,
            color: '#1f2937',
            textAlign: 'right',
            padding: 0,
          }}
        />
      </View>
    </View>
  );

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
              maxHeight: '90%',
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
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937', textAlign: 'right' }}>
                إضافة حصة جديدة
              </Text>
              <Pressable onPress={handleClose} style={{ padding: 8 }}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Session Type Select */}
              {renderSelect(
                'نوع الحصة',
                sessionType,
                typeDropdownOpen,
                () => {
                  setTypeDropdownOpen(!typeDropdownOpen);
                  setDayDropdownOpen(false);
                  setCapacityDropdownOpen(false);
                },
                SESSION_TYPES.map((type) => ({
                  label: type,
                  onSelect: () => {
                    setSessionType(type);
                    setTypeDropdownOpen(false);
                  },
                }))
              )}

              {/* Day Select */}
              {renderSelect(
                'اليوم',
                selectedDay !== null ? DAY_OPTIONS[selectedDay].label : '',
                dayDropdownOpen,
                () => {
                  setDayDropdownOpen(!dayDropdownOpen);
                  setTypeDropdownOpen(false);
                  setCapacityDropdownOpen(false);
                },
                DAY_OPTIONS.map((day) => ({
                  label: day.label,
                  onSelect: () => {
                    setSelectedDay(day.value);
                    setDayDropdownOpen(false);
                  },
                }))
              )}

              {/* Time Inputs Row */}
              <View style={{ flexDirection: 'row-reverse', gap: 12, marginBottom: 16 }}>
                {renderTimeInput('وقت البداية', startTime, handleStartTimeChange, '00:00')}
                {renderTimeInput('وقت النهاية', endTime, handleEndTimeChange, '00:00')}
              </View>

              {/* Time Error */}
              {timeError ? (
                <Text style={{ fontSize: 13, color: '#dc2626', textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                  {timeError}
                </Text>
              ) : null}

              {/* Capacity Select */}
              {renderSelect(
                'عدد الأسرة المتاحة',
                capacity !== null ? String(capacity) : '',
                capacityDropdownOpen,
                () => {
                  setCapacityDropdownOpen(!capacityDropdownOpen);
                  setTypeDropdownOpen(false);
                  setDayDropdownOpen(false);
                },
                CAPACITY_OPTIONS.map((cap) => ({
                  label: String(cap),
                  onSelect: () => {
                    setCapacity(cap);
                    setCapacityDropdownOpen(false);
                  },
                }))
              )}

              {/* Action Buttons */}
              <View style={{ marginTop: 24, marginBottom: 40 }}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!isFormValid()}
                  style={{
                    backgroundColor: isFormValid() ? '#8b5cf6' : '#d1d5db',
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                    إنشاء الحصة الجديدة
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleClose}
                  style={{
                    backgroundColor: '#f3f4f6',
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#6b7280' }}>
                    إلغاء
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddSessionModal;

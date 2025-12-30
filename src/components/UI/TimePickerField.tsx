// src/components/UI/TimePickerField.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';

interface TimePickerFieldProps {
  label: string;
  value: string; // HH:mm format
  onChange: (time: string) => void;
  disabled?: boolean;
  error?: string;
}

// Parse HH:mm to Date
const parseTime = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

// Format Date to HH:mm
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Format HH:mm to Arabic display (12-hour with AM/PM)
const formatDisplayTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const TimePickerField: React.FC<TimePickerFieldProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(formatTime(selectedDate));
    }
  };

  const handleDone = () => {
    setShowPicker(false);
  };

  return (
    <View className="mb-3">
      <Text className="text-sm text-gray-600 mb-1 text-right">{label}</Text>
      <TouchableOpacity
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        className={`flex-row items-center justify-between bg-gray-50 border rounded-xl px-4 py-3 ${
          error ? 'border-red-500' : 'border-gray-200'
        }`}
        style={{ opacity: disabled ? 0.5 : 1 }}
        activeOpacity={0.7}
      >
        <Clock size={18} color="#9CA3AF" />
        <Text className="text-base text-gray-800">
          {formatDisplayTime(value)}
        </Text>
      </TouchableOpacity>
      {error && (
        <Text className="text-xs text-red-500 mt-1 text-right">{error}</Text>
      )}

      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View className="bg-white border-t border-gray-200 pt-2">
              <View className="flex-row justify-between px-4 mb-2">
                <TouchableOpacity onPress={handleDone}>
                  <Text className="text-purple-600 font-semibold">تم</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseTime(value)}
                mode="time"
                display="spinner"
                onChange={handleChange}
                minuteInterval={5}
                locale="ar"
              />
            </View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={parseTime(value)}
              mode="time"
              display="default"
              onChange={handleChange}
              minuteInterval={5}
            />
          )}
        </>
      )}
    </View>
  );
};

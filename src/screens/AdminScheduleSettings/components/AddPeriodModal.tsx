// src/screens/AdminScheduleSettings/components/AddPeriodModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { X } from 'lucide-react-native';
import { TimePickerField } from '../../../components/UI/TimePickerField';
import { WorkPeriod } from '../../../types/scheduleSettings';

interface AddPeriodModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (period: WorkPeriod) => void;
  existingPeriods: WorkPeriod[];
}

// Check if two periods overlap
const periodsOverlap = (p1: WorkPeriod, p2: WorkPeriod): boolean => {
  return p1.startTime < p2.endTime && p2.startTime < p1.endTime;
};

export const AddPeriodModal: React.FC<AddPeriodModalProps> = ({
  visible,
  onClose,
  onAdd,
  existingPeriods,
}) => {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
      // Reset form
      setStartTime('08:00');
      setEndTime('12:00');
      setError(null);
    }
  }, [visible, fadeAnim]);

  const handleAdd = () => {
    // Validate times
    if (startTime >= endTime) {
      setError('وقت البداية يجب أن يكون قبل وقت النهاية');
      return;
    }

    // Check for overlaps
    const newPeriod: WorkPeriod = {
      id: `period-${Date.now()}`,
      startTime,
      endTime,
    };

    const hasOverlap = existingPeriods.some((p) => periodsOverlap(p, newPeriod));
    if (hasOverlap) {
      setError('هذه الفترة تتداخل مع فترة موجودة');
      return;
    }

    onAdd(newPeriod);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="bg-white rounded-t-3xl p-5"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              activeOpacity={0.7}
            >
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">إضافة فترة عمل</Text>
          </View>

          {/* Time pickers */}
          <TimePickerField
            label="وقت البداية"
            value={startTime}
            onChange={setStartTime}
          />
          <TimePickerField
            label="وقت النهاية"
            value={endTime}
            onChange={setEndTime}
          />

          {/* Error */}
          {error && (
            <Text className="text-red-500 text-sm text-right mb-3">{error}</Text>
          )}

          {/* Actions */}
          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-100 py-3 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold text-center">إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              className="flex-1 bg-purple-600 py-3 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-center">إضافة</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

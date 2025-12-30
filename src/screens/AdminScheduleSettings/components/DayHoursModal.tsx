// src/screens/AdminScheduleSettings/components/DayHoursModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { Switch } from '../../../components/UI/Switch';
import { DaySettings, WorkPeriod, ARABIC_DAY_NAMES } from '../../../types/scheduleSettings';
import { WorkPeriodsList } from './WorkPeriodsList';
import { AddPeriodModal } from './AddPeriodModal';
import { DeletePeriodAlert } from './DeletePeriodAlert';
import { DeleteDayAlert } from './DeleteDayAlert';

interface DayHoursModalProps {
  visible: boolean;
  day: DaySettings | null;
  onClose: () => void;
  onSave: (day: DaySettings) => void;
  saving?: boolean;
}

export const DayHoursModal: React.FC<DayHoursModalProps> = ({
  visible,
  day,
  onClose,
  onSave,
  saving = false,
}) => {
  const [localDay, setLocalDay] = useState<DaySettings | null>(null);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);
  const [showDeleteDay, setShowDeleteDay] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible && day) {
      setLocalDay({ ...day, workPeriods: [...day.workPeriods] });
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, day, fadeAnim]);

  if (!localDay) return null;

  const dayName = ARABIC_DAY_NAMES[localDay.dayOfWeek];

  const handleToggleEnabled = (enabled: boolean) => {
    setLocalDay({ ...localDay, enabled });
  };

  const handleAddPeriod = (period: WorkPeriod) => {
    const newPeriods = [...localDay.workPeriods, period].sort(
      (a, b) => a.startTime.localeCompare(b.startTime)
    );
    setLocalDay({ ...localDay, workPeriods: newPeriods });
  };

  const handleDeletePeriod = (periodId: string) => {
    const newPeriods = localDay.workPeriods.filter((p) => p.id !== periodId);
    setLocalDay({ ...localDay, workPeriods: newPeriods });
    setPeriodToDelete(null);
  };

  const handleDeleteDay = () => {
    setLocalDay({ ...localDay, enabled: false, workPeriods: [] });
    setShowDeleteDay(false);
  };

  const handleSave = () => {
    onSave(localDay);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="flex-1 bg-white mt-16 rounded-t-3xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              activeOpacity={0.7}
            >
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">{dayName}</Text>
            <View className="w-8" />
          </View>

          <ScrollView className="flex-1 p-5">
            {/* Enable toggle */}
            <View className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4 mb-5">
              <Switch
                value={localDay.enabled}
                onValueChange={handleToggleEnabled}
              />
              <Text className="text-base font-semibold text-gray-800">
                تفعيل يوم {dayName}
              </Text>
            </View>

            {/* Work periods */}
            {localDay.enabled && (
              <WorkPeriodsList
                periods={localDay.workPeriods}
                onDeletePeriod={(id) => setPeriodToDelete(id)}
                onAddPeriod={() => setShowAddPeriod(true)}
              />
            )}

            {/* Delete day button */}
            {localDay.enabled && (
              <TouchableOpacity
                onPress={() => setShowDeleteDay(true)}
                className="flex-row items-center justify-center mt-6 py-3"
                activeOpacity={0.7}
              >
                <Text className="text-red-500 font-medium ml-1">
                  إلغاء اليوم بالكامل
                </Text>
                <AlertTriangle size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="p-5 border-t border-gray-100">
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className={`py-4 rounded-xl ${saving ? 'bg-purple-400' : 'bg-purple-600'}`}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-center text-base">
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات لهذا اليوم'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Sub-modals */}
      <AddPeriodModal
        visible={showAddPeriod}
        onClose={() => setShowAddPeriod(false)}
        onAdd={handleAddPeriod}
        existingPeriods={localDay.workPeriods}
      />

      <DeletePeriodAlert
        visible={!!periodToDelete}
        onClose={() => setPeriodToDelete(null)}
        onConfirm={() => periodToDelete && handleDeletePeriod(periodToDelete)}
      />

      <DeleteDayAlert
        visible={showDeleteDay}
        dayName={dayName}
        onClose={() => setShowDeleteDay(false)}
        onConfirm={handleDeleteDay}
      />
    </Modal>
  );
};

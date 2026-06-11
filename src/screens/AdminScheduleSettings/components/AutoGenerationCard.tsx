// src/screens/AdminScheduleSettings/components/AutoGenerationCard.tsx
//
// AUTOGEN-UI — admin settings card for automatic (nightly cron) session
// generation. When enabled, the server's midnight cron auto-generates sessions
// from the enabled days' work periods through `horizonDays` ahead (always 14 —
// the next two weeks), so customers can book future weeks without the admin
// manually generating each week.
//
// The card is presentational + local-state only. It calls `onChange` with the
// next `AutoGenerationSettings` whenever the admin toggles/changes a value; the
// parent screen persists it (current days + the autoGeneration object) and owns
// the success/error toasts — mirroring how `handleToggleDay`/`handleSaveDay`
// persist day settings.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import {
  AutoGenerationSettings,
  DURATION_PRESETS,
} from '../../../types/scheduleSettings';

// Bed count presets — match AutoGenerateSection.
const BED_COUNT_PRESETS = [2, 3, 4, 5, 6, 8];

// horizonDays has no UI knob — always the next two weeks (AUTOGEN-UI spec).
const HORIZON_DAYS = 14;

// Defaults when the server has no autoGeneration yet.
const DEFAULT_DURATION = 60;
const DEFAULT_CAPACITY = 4;

interface AutoGenerationCardProps {
  value?: AutoGenerationSettings;
  // Persist the next settings (parent owns the mutation + toasts).
  onChange: (next: AutoGenerationSettings) => void;
  saving?: boolean;
}

export const AutoGenerationCard: React.FC<AutoGenerationCardProps> = ({
  value,
  onChange,
  saving = false,
}) => {
  const [enabled, setEnabled] = useState<boolean>(value?.enabled ?? false);
  const [durationMinutes, setDurationMinutes] = useState<number>(
    value?.durationMinutes ?? DEFAULT_DURATION
  );
  const [capacity, setCapacity] = useState<number>(
    value?.capacity ?? DEFAULT_CAPACITY
  );

  // Build the full settings object from the latest local fields and persist.
  const persist = (next: {
    enabled: boolean;
    durationMinutes: number;
    capacity: number;
  }) => {
    onChange({
      enabled: next.enabled,
      durationMinutes: next.durationMinutes,
      capacity: next.capacity,
      horizonDays: HORIZON_DAYS,
    });
  };

  const handleToggleEnabled = (nextEnabled: boolean) => {
    setEnabled(nextEnabled);
    persist({ enabled: nextEnabled, durationMinutes, capacity });
  };

  const handleSelectDuration = (next: number) => {
    setDurationMinutes(next);
    persist({ enabled, durationMinutes: next, capacity });
  };

  const handleSelectCapacity = (next: number) => {
    setCapacity(next);
    persist({ enabled, durationMinutes, capacity: next });
  };

  // Only show concrete duration presets (skip the "custom" 0 entry — the
  // auto-generation flow has no custom-duration input).
  const durationPresets = DURATION_PRESETS.filter((p) => p.value > 0);

  return (
    <View
      className="bg-white rounded-2xl mx-5 mt-4 p-4"
      style={{
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row-reverse items-center justify-end mb-2">
        <Text className="text-lg font-bold text-gray-900 mr-2">
          التوليد التلقائي للحصص
        </Text>
        <RefreshCw size={20} color="#8b5cf6" />
      </View>

      {/* Enable row: explainer + switch */}
      <View className="flex-row-reverse items-center justify-between mb-1">
        <Text className="text-sm text-gray-600 text-right flex-1 ml-3">
          عند التفعيل، تُنشأ الحصص تلقائياً كل ليلة للأسبوعين القادمين حسب أيام
          وساعات العمل
        </Text>
        <Switch
          value={enabled}
          onValueChange={handleToggleEnabled}
          disabled={saving}
          trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
          thumbColor={enabled ? '#8b5cf6' : '#F3F4F6'}
          ios_backgroundColor="#E5E7EB"
        />
      </View>

      {enabled && (
        <View className="mt-3">
          {/* Duration selection */}
          <Text className="text-sm font-semibold text-gray-700 mb-2 text-right">
            مدة الحصة
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {durationPresets.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                onPress={() => handleSelectDuration(preset.value)}
                disabled={saving}
                className={`px-4 py-2 rounded-lg ${
                  durationMinutes === preset.value ? 'bg-purple-600' : 'bg-gray-100'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-medium ${
                    durationMinutes === preset.value ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bed count selection */}
          <Text className="text-sm font-semibold text-gray-700 mb-2 text-right">
            عدد الأسرّة
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {BED_COUNT_PRESETS.map((count) => (
              <TouchableOpacity
                key={count}
                onPress={() => handleSelectCapacity(count)}
                disabled={saving}
                className={`px-4 py-2 rounded-lg ${
                  capacity === count ? 'bg-purple-600' : 'bg-gray-100'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-medium ${
                    capacity === count ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

export default AutoGenerationCard;

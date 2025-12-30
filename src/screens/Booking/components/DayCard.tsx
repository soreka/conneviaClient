import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';

interface DayCardProps {
  dayName: string;
  dateLabel: string;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}

export const DayCard: React.FC<DayCardProps> = ({
  dayName,
  dateLabel,
  isSelected,
  isDisabled,
  onSelect,
}) => {
  // Dynamic classes based on state
  const containerClasses = `
    flex-1 rounded-2xl p-4 items-center justify-center min-h-[110px]
    ${isDisabled ? 'bg-muted opacity-60' : 'bg-white'}
    ${isSelected && !isDisabled ? 'border-2 border-primary bg-accent' : 'border border-border'}
  `;

  return (
    <Pressable
      onPress={() => !isDisabled && onSelect()}
      disabled={isDisabled}
      className={containerClasses}
      style={{ 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: isDisabled ? 0 : 2,
      }}
    >
      {/* Day Name */}
      <Text className={`text-lg font-semibold mb-1 ${isDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
        {dayName}
      </Text>

      {/* Date */}
      <Text className={`text-sm mb-2 ${isDisabled ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
        {dateLabel}
      </Text>

      {/* Selected Checkmark */}
      {isSelected && !isDisabled && (
        <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mt-1">
          <Check size={14} color="#ffffff" />
        </View>
      )}

      {/* Disabled Pill */}
      {isDisabled && (
        <View className="bg-warning/20 px-3 py-1 rounded-full mt-1">
          <Text className="text-xs text-warning font-medium">
            يوم مغلق
          </Text>
        </View>
      )}
    </Pressable>
  );
};

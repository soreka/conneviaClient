// src/components/UI/Checkbox.tsx
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Check } from 'lucide-react-native';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { box: 16, icon: 12, text: 'text-sm' },
  md: { box: 20, icon: 14, text: 'text-base' },
  lg: { box: 24, icon: 18, text: 'text-lg' },
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  size = 'md',
}) => {
  const { box, icon, text } = SIZES[size];

  const handlePress = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      className="flex-row-reverse items-center"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          width: box,
          height: box,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: checked ? '#8b5cf6' : '#D1D5DB',
          backgroundColor: checked ? '#8b5cf6' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Check size={icon} color="#FFFFFF" strokeWidth={3} />}
      </View>
      {label && (
        <Text className={`${text} text-gray-700 mr-2`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

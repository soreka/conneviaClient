// src/components/UI/Progress.tsx
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { cn } from '../../lib/utils';

type ProgressVariant = 'default' | 'success' | 'warning' | 'destructive';

interface ProgressProps {
  value: number; // 0-100
  variant?: ProgressVariant;
  className?: string;
  // Style passthrough on the outer track — e.g. the RTL `scaleX: -1` flip
  // CompleteProfileWizard applies so the bar fills right-to-left.
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  variant = 'default',
  className,
  style,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <View
      className={cn('h-2 w-full rounded-full bg-muted overflow-hidden', className)}
      style={style}
    >
      <View
        className={cn('h-full rounded-full', variantStyles[variant])}
        style={{ width: `${clampedValue}%` }}
      />
    </View>
  );
};

// src/components/UI/Badge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'border border-border bg-transparent',
  destructive: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
};

const variantTextStyles: Record<BadgeVariant, string> = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  destructive: 'text-destructive-foreground',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className,
}) => {
  return (
    <View
      className={cn(
        'px-2.5 py-0.5 rounded-full',
        variantStyles[variant],
        className
      )}
    >
      {typeof children === 'string' ? (
        <Text className={cn('text-xs font-semibold', variantTextStyles[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};

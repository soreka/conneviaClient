// src/components/UI/Divider.tsx
import React from 'react';
import { View } from 'react-native';
import { cn } from '../../lib/utils';

interface DividerProps {
  className?: string;
  vertical?: boolean;
}

export const Divider: React.FC<DividerProps> = ({ className, vertical = false }) => {
  return (
    <View
      className={cn(
        'bg-border',
        vertical ? 'w-px h-full' : 'h-px w-full',
        className
      )}
    />
  );
};

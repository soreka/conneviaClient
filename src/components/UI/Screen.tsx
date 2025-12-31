// src/components/UI/Screen.tsx
import React from 'react';
import { View, ScrollView, ViewProps, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../../lib/utils';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padding?: boolean;
  safe?: boolean;
  className?: string;
  contentContainerClassName?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  padding = false,
  safe = true,
  className,
  contentContainerClassName,
}) => {
  const containerClass = cn(
    'flex-1 bg-background',
    padding && 'p-4',
    className
  );

  const content = scroll ? (
    <ScrollView
      className={containerClass}
      contentContainerStyle={{ flexGrow: 1 }}
      contentContainerClassName={contentContainerClassName}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={containerClass}>{children}</View>
  );

  if (safe) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {content}
      </SafeAreaView>
    );
  }

  return content;
};

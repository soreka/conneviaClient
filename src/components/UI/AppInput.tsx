// src/components/UI/AppInput.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '../../lib/utils';

interface AppInputProps extends Omit<TextInputProps, 'className'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  className?: string;
  inputClassName?: string;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  isPassword = false,
  className,
  inputClassName,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className="text-sm font-medium text-foreground mb-1.5 text-right">
          {label}
        </Text>
      )}
      
      <View
        className={cn(
          'flex-row-reverse items-center border rounded-lg px-3 h-12 bg-background',
          isFocused && !hasError && 'border-primary',
          hasError ? 'border-destructive' : 'border-input',
        )}
      >
        {leftIcon && <View className="ml-2">{leftIcon}</View>}
        
        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            'flex-1 text-base text-foreground text-right',
            inputClassName
          )}
          placeholderTextColor="#8C8C8C"
        />
        
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="mr-2"
          >
            {showPassword ? (
              <EyeOff size={20} color="#8C8C8C" />
            ) : (
              <Eye size={20} color="#8C8C8C" />
            )}
          </TouchableOpacity>
        ) : (
          rightIcon && <View className="mr-2">{rightIcon}</View>
        )}
      </View>
      
      {hint && !error && (
        <Text className="text-xs text-muted-foreground mt-1 text-right">
          {hint}
        </Text>
      )}
      
      {error && (
        <Text className="text-xs text-destructive mt-1 text-right">
          {error}
        </Text>
      )}
    </View>
  );
};

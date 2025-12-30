import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface SessionCardProps {
  timeRange: string;
  sessionType: string;
  instructorName: string;
  availableSeats: number;
  capacity: number;
  isSelected: boolean;
  isFull: boolean;
  onSelect: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  timeRange,
  sessionType,
  instructorName,
  availableSeats,
  capacity,
  isSelected,
  isFull,
  onSelect,
}) => {
  const availablePercent = capacity > 0 ? (availableSeats / capacity) * 100 : 0;
  
  // Progress bar color based on availability percentage
  const getProgressColor = () => {
    if (isFull || availablePercent === 0) return '#9CA3AF'; // Grey when full
    if (availablePercent <= 50) return '#F97316'; // Orange when 1-50%
    return '#22C55E'; // Green when >50%
  };

  const containerClasses = `
    bg-white rounded-2xl p-4 mb-3
    ${isSelected ? 'border-2 border-primary bg-accent' : 'border border-border'}
    ${isFull ? 'opacity-50' : ''}
  `;

  return (
    <Pressable
      onPress={() => !isFull && onSelect()}
      disabled={isFull}
      className={containerClasses}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row justify-between items-start">
        {/* Left Side - Progress Bar */}
        <View className="flex-1 pl-3">
          <Text className="text-xs text-muted-foreground mb-1">
            {availableSeats} من {capacity} متاح
          </Text>
          
          {/* Progress Bar */}
          <View className="h-2 bg-border rounded-full overflow-hidden w-20">
            <View 
              className="h-full rounded-full"
              style={{ 
                width: `${100 - availablePercent}%`,
                backgroundColor: getProgressColor(),
              }} 
            />
          </View>
        </View>

        {/* Right Side - Details */}
        <View className="flex-2 items-end">
          {/* Status Pill & Time */}
          <View className="flex-row items-center mb-2">
            <Text className="text-lg font-semibold text-foreground ml-2">
              {timeRange}
            </Text>
            
            <View className={`px-3 py-1 rounded-full ${isFull ? 'bg-destructive/10' : 'border border-muted-foreground/30'}`}>
              <Text className={`text-xs font-medium ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
                {isFull ? 'ممتلئ' : 'متاح'}
              </Text>
            </View>
          </View>

          {/* Session Type */}
          <Text className="text-sm font-medium text-foreground mb-0.5 text-right">
            {sessionType}
          </Text>

          {/* Instructor */}
          <Text className="text-xs text-muted-foreground text-right">
            {instructorName}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

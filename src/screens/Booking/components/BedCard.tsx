import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BedIcon } from '../../../components/icons/BedIcon';

interface BedCardProps {
  bedNumber: number;
  isBooked: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export const BedCard: React.FC<BedCardProps> = ({
  bedNumber,
  isBooked,
  isSelected,
  onSelect,
}) => {
  const containerClasses = `
    w-[47%] rounded-2xl p-4 m-[1.5%] items-center
    ${isBooked ? 'bg-muted opacity-60' : 'bg-white'}
    ${isSelected && !isBooked ? 'border-2 border-primary bg-accent' : 'border border-border'}
  `;

  return (
    <Pressable
      onPress={() => !isBooked && onSelect()}
      disabled={isBooked}
      className={containerClasses}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: isBooked ? 0 : 2,
      }}
    >
      {/* Bed Icon - SVG with circular background and subtle shadow */}
      <View 
        style={{ 
          marginBottom: 12,
          shadowColor: '#7A67A0',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
          borderRadius: 9999,
        }}
      >
        <BedIcon size={72} opacity={isBooked ? 0.4 : 1} />
      </View>

      {/* Bed Number */}
      <Text className={`text-base font-semibold mb-1.5 ${isBooked ? 'text-muted-foreground' : 'text-foreground'}`}>
        سرير {bedNumber}
      </Text>

      {/* Status Pill */}
      <View className={`px-3 py-1 rounded-full ${isBooked ? 'bg-muted' : 'bg-success/10'}`}>
        <Text className={`text-xs font-medium ${isBooked ? 'text-muted-foreground' : 'text-success'}`}>
          {isBooked ? 'محجوز' : 'متاح'}
        </Text>
      </View>
    </Pressable>
  );
};

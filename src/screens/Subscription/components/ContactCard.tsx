// src/screens/Subscription/components/ContactCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Phone, MessageCircle } from 'lucide-react-native';

interface ContactCardProps {
  onContactPress?: () => void;
  phoneNumber?: string;
  whatsappNumber?: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  onContactPress,
  phoneNumber = '+972501234567',
  whatsappNumber = '+972501234567',
}) => {
  const handlePhonePress = () => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsAppPress = () => {
    Linking.openURL(`whatsapp://send?phone=${whatsappNumber.replace('+', '')}`);
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-purple-100 shadow-sm">
      <Text className="text-base font-bold text-gray-900 text-right mb-3">
        هل تحتاج مساعدة؟
      </Text>
      <Text className="text-sm text-gray-500 text-right mb-4">
        تواصل معنا للاستفسار عن الاشتراكات والعروض
      </Text>

      <View className="flex-row-reverse gap-3">
        <TouchableOpacity
          onPress={handlePhonePress}
          className="flex-1 bg-purple-100 rounded-xl py-3 flex-row-reverse items-center justify-center"
          activeOpacity={0.7}
        >
          <Phone size={18} color="#8b5cf6" />
          <Text className="text-purple-700 font-medium mr-2">اتصال</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleWhatsAppPress}
          className="flex-1 bg-green-100 rounded-xl py-3 flex-row-reverse items-center justify-center"
          activeOpacity={0.7}
        >
          <MessageCircle size={18} color="#16a34a" />
          <Text className="text-green-700 font-medium mr-2">واتساب</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

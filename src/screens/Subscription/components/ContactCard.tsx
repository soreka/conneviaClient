// src/screens/Subscription/components/ContactCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Phone, MessageCircle } from 'lucide-react-native';
import { openExternalUrl } from '../../../utils/openExternalUrl';

interface ContactCardProps {
  onContactPress?: () => void;
  phoneNumber?: string;
  whatsappNumber?: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  onContactPress,
  phoneNumber = '+972549222841',
  whatsappNumber = '+972549222841',
}) => {
  const handlePhonePress = () => {
    openExternalUrl(`tel:${phoneNumber}`);
  };

  // https://wa.me/<digits> — NOT the `whatsapp://` custom scheme. The custom
  // scheme silently does nothing on a device without WhatsApp installed (the
  // normal case for an App Review device) and rejects with no handler, which
  // reads as a dead button. The https form opens the app when installed and
  // falls back to WhatsApp Web otherwise, and needs no LSApplicationQueriesSchemes.
  const handleWhatsAppPress = () => {
    openExternalUrl(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`);
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

// src/screens/Subscription/components/ContactModal.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal, Linking, Pressable } from 'react-native';
import { X, Phone, MessageCircle, Mail } from 'lucide-react-native';

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
  phoneNumber?: string;
  whatsappNumber?: string;
  email?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  visible,
  onClose,
  phoneNumber = '+972501234567',
  whatsappNumber = '+972501234567',
  email = 'support@connevia.com',
}) => {
  const handlePhonePress = () => {
    Linking.openURL(`tel:${phoneNumber}`);
    onClose();
  };

  const handleWhatsAppPress = () => {
    Linking.openURL(`whatsapp://send?phone=${whatsappNumber.replace('+', '')}`);
    onClose();
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${email}`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center px-6"
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-2xl w-full max-w-sm p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row-reverse items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">تواصل معنا</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-gray-500 text-right mb-6">
            اختر طريقة التواصل المفضلة لديك
          </Text>

          {/* Contact options */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handlePhonePress}
              className="bg-purple-100 rounded-xl py-4 px-4 flex-row-reverse items-center"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-purple-200 rounded-full items-center justify-center">
                <Phone size={20} color="#8b5cf6" />
              </View>
              <View className="flex-1 mr-3">
                <Text className="text-base font-medium text-purple-900 text-right">اتصال هاتفي</Text>
                <Text className="text-sm text-purple-600 text-right">{phoneNumber}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsAppPress}
              className="bg-green-100 rounded-xl py-4 px-4 flex-row-reverse items-center"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-green-200 rounded-full items-center justify-center">
                <MessageCircle size={20} color="#16a34a" />
              </View>
              <View className="flex-1 mr-3">
                <Text className="text-base font-medium text-green-900 text-right">واتساب</Text>
                <Text className="text-sm text-green-600 text-right">رسالة فورية</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmailPress}
              className="bg-blue-100 rounded-xl py-4 px-4 flex-row-reverse items-center"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-blue-200 rounded-full items-center justify-center">
                <Mail size={20} color="#2563eb" />
              </View>
              <View className="flex-1 mr-3">
                <Text className="text-base font-medium text-blue-900 text-right">بريد إلكتروني</Text>
                <Text className="text-sm text-blue-600 text-right">{email}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

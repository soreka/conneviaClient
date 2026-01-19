// src/screens/Dashboard/components/DashboardHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DashboardHeaderProps {
  userName?: string;
  userEmail?: string;
  hasNotifications?: boolean;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  userEmail,
  hasNotifications = false,
  onNotificationPress,
  onAvatarPress,
}) => {
  const insets = useSafeAreaInsets();
  
  // Get display name - prefer actual name, fallback to email prefix
  const displayName = userName 
    ? userName.split(' ')[0]
    : userEmail 
      ? userEmail.split('@')[0] 
      : 'ضيفة';

  // Get initial for avatar
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <LinearGradient
      colors={['#8b5cf6', '#a78bfa', '#c4b5fd']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top }}
    >
      <View className="px-5 pt-4 pb-16">
        {/* Top row: Avatar and Bell */}
        <View className="flex-row items-center justify-between mb-4">
          {/* Bell icon (left in RTL) */}
          <TouchableOpacity
            onPress={onNotificationPress}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <Bell size={20} color="#FFFFFF" />
            {hasNotifications && (
              <View className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
            )}
          </TouchableOpacity>

          {/* Avatar (right in RTL) */}
          <TouchableOpacity
            onPress={onAvatarPress}
            className="w-11 h-11 rounded-full bg-white items-center justify-center"
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text className="text-lg font-bold text-purple-600">{initial}</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View className="items-end">
          <Text className="text-2xl font-bold text-white mb-1">
            مرحبًا يا {displayName} 👋
          </Text>
          {userEmail && (
            <Text className="text-sm text-white/70 mb-1">
              {userEmail}
            </Text>
          )}
          <Text className="text-base text-white/80">
            سعداء بعودتك إلى التدريب
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

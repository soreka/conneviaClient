// src/screens/Admin/components/AdminScheduleHeader.tsx
// Role: Admin schedule header matching Lovable design
// - Top-left: settings pill/button
// - Center: main title "إعدادات الجدول" with gear icon
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';

interface AdminScheduleHeaderProps {
  onSettingsPress?: () => void;
}

export const AdminScheduleHeader: React.FC<AdminScheduleHeaderProps> = ({
  onSettingsPress,
}) => {
  const insets = useSafeAreaInsets();

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      if (__DEV__) {
        console.log('[AdminSchedule] Settings button pressed');
      }
    }
  };

  return (
    <LinearGradient
      colors={['#A68CD4', '#F2C6DE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + 12,
        paddingBottom: 24,
        paddingHorizontal: 16,
      }}
    >
      {/* Top row: Settings pill on the left (RTL: appears on visual left) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Pressable
          onPress={handleSettingsPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Settings size={16} color="#ffffff" />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: '#ffffff',
              marginLeft: 6,
            }}
          >
            الإعدادات
          </Text>
        </Pressable>
      </View>

      {/* Center: Main title with gear icon */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Settings size={22} color="#ffffff" style={{ marginRight: 8 }} />
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: '#ffffff',
          }}
        >
          إعدادات الجدول
        </Text>
      </View>
    </LinearGradient>
  );
};

export default AdminScheduleHeader;

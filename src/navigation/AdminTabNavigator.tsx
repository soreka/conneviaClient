// src/navigation/AdminTabNavigator.tsx
// Role: Bottom tab navigator for admin users
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Calendar, Users, CreditCard } from 'lucide-react-native';
import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { AdminScheduleStackNavigator } from './AdminScheduleStackNavigator';
import { AdminPaymentsScreen } from '../screens/Admin/AdminPaymentsScreen';

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminSchedule: undefined;
  AdminCustomers: undefined;
  AdminPayments: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

// Placeholder screens for admin tabs
const AdminDashboardScreen = () => <PlaceholderScreen title="لوحة التحكم" />;
const AdminCustomersScreen = () => <PlaceholderScreen title="العملاء" />;

export const AdminTabNavigator = () => {
  const insets = useSafeAreaInsets();
  
  // Calculate tab bar height: base height + safe area bottom inset
  const tabBarHeight = 60 + Math.max(insets.bottom, 8);
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: '#8b5cf6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'لوحة التحكم',
          headerTitle: 'لوحة التحكم',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminSchedule"
        component={AdminScheduleStackNavigator}
        options={{
          tabBarLabel: 'الجدول',
          headerShown: false, // Custom header in screen
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminCustomers"
        component={AdminCustomersScreen}
        options={{
          tabBarLabel: 'العملاء',
          headerTitle: 'العملاء',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminPayments"
        component={AdminPaymentsScreen}
        options={{
          tabBarLabel: 'المدفوعات',
          headerTitle: 'المدفوعات',
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

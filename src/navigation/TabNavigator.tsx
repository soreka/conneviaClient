// src/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, List, CreditCard, User } from 'lucide-react-native';
import { DashboardScreen } from '../screens/Dashboard';
import { ScheduleStackNavigator } from './ScheduleStackNavigator';
import { SubscriptionStackNavigator } from './SubscriptionStackNavigator';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export type TabParamList = {
  Dashboard: undefined;
  Schedule: undefined;
  MyReservations: undefined;
  MySubscription: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  
  // Calculate tab bar height: base height + safe area bottom inset
  const tabBarHeight = 60 + Math.max(insets.bottom, 8);
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#8b5cf6', // Primary purple/violet color
        tabBarInactiveTintColor: '#9ca3af', // Gray color
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
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'الرئيسية',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleStackNavigator}
        options={{
          tabBarLabel: 'الجدول',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyReservations"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: 'حجوزاتي',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MySubscription"
        component={SubscriptionStackNavigator}
        options={{
          tabBarLabel: 'اشتراكي',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'حسابي',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

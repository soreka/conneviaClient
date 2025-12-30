// src/navigation/AdminScheduleStackNavigator.tsx
// Stack navigator for admin schedule screens
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminScheduleScreen } from '../screens/Admin/AdminScheduleScreen';
import { AdminScheduleSettingsScreen } from '../screens/AdminScheduleSettings';

export type AdminScheduleStackParamList = {
  AdminScheduleMain: undefined;
  AdminScheduleSettings: undefined;
};

const Stack = createNativeStackNavigator<AdminScheduleStackParamList>();

export const AdminScheduleStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="AdminScheduleMain"
        component={AdminScheduleScreen}
      />
      <Stack.Screen
        name="AdminScheduleSettings"
        component={AdminScheduleSettingsScreen}
      />
    </Stack.Navigator>
  );
};

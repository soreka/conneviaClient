import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScheduleScreen } from '../screens/Schedule';
import { BookingWizardScreen, BookingWizardParams } from '../screens/Booking/BookingWizardScreen';

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  BookingWizard: BookingWizardParams | undefined;
};

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export const ScheduleStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="ScheduleList"
        component={ScheduleScreen}
      />
      <Stack.Screen
        name="BookingWizard"
        component={BookingWizardScreen}
      />
    </Stack.Navigator>
  );
};

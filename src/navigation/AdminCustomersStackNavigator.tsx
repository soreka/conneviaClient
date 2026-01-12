// src/navigation/AdminCustomersStackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminCustomersScreen } from '../screens/Admin/AdminCustomersScreen';
import { AdminCustomerDetailsScreen } from '../screens/Admin/AdminCustomerDetailsScreen';

export type AdminCustomersStackParamList = {
  AdminCustomersList: undefined;
  AdminCustomerDetails: { customerId: string };
};

const Stack = createNativeStackNavigator<AdminCustomersStackParamList>();

export const AdminCustomersStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="AdminCustomersList"
        component={AdminCustomersScreen}
      />
      <Stack.Screen
        name="AdminCustomerDetails"
        component={AdminCustomerDetailsScreen}
      />
    </Stack.Navigator>
  );
};

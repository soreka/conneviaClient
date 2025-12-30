// src/navigation/SubscriptionStackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SubscriptionScreen } from '../screens/Subscription/SubscriptionScreen';
import { SubscriptionPlansScreen } from '../screens/SubscriptionPlans/SubscriptionPlansScreen';

export type SubscriptionStackParamList = {
  SubscriptionMain: undefined;
  SubscriptionPlans: undefined;
};

const Stack = createNativeStackNavigator<SubscriptionStackParamList>();

export const SubscriptionStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#8b5cf6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="SubscriptionMain"
        component={SubscriptionScreen}
        options={{
          headerTitle: 'اشتراكي',
        }}
      />
      <Stack.Screen
        name="SubscriptionPlans"
        component={SubscriptionPlansScreen}
        options={{
          headerTitle: 'خطط الاشتراك',
        }}
      />
    </Stack.Navigator>
  );
};

import React from "react";
import "./global.css";
import { verifyInstallation } from 'nativewind';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from './src/app/store';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  verifyInstallation();
  
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

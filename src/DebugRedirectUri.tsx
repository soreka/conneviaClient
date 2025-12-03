import React from 'react'
// connevia/src/DebugRedirectUri.tsx
import * as AuthSession from 'expo-auth-session';
import { SafeAreaView, Text } from 'react-native';
import { View } from 'react-native';
// type Props = {}

export  const DebugRedirectUri = () => {
  
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'connevia' });
    return (
      <View >
        
        <Text selectable className="text-gray-500 font-semibold">Redirect URI:</Text>
        <Text selectable className="text-blue-500 font-semibold">{redirectUri}</Text>
      </View>   
    );
}

export default DebugRedirectUri ;
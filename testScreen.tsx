import React from 'react'
// connevia/src/DebugRedirectUri.tsx
import * as AuthSession from 'expo-auth-session';
import { SafeAreaView, Text } from 'react-native';
type Props = {}

const testScreen = () => {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'connevia' });
    return (
      <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center', padding:16 }}>
        <Text selectable>Redirect URI:</Text>
        <Text selectable>{redirectUri}</Text>
      </SafeAreaView>
    );
}

export default testScreen
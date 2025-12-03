// connevia/src/AuthTestScreen.tsx
import React from 'react';
import { SafeAreaView, Text, Button, Alert } from 'react-native';
import { useAuth, api } from './auth/useAuth';

export default function AuthTestScreen() {
  const { accessToken, login, logout, redirectUri } = useAuth();

  return (
    <SafeAreaView style={{ flex:1, justifyContent:'center', alignItems:'center', gap:12 }}>
      <Text selectable>Redirect: {redirectUri}</Text>
      {accessToken ? (
        <>
          <Text>Logged in ✅</Text>
          <Button title="Call /v1/me" onPress={async () => {
            const res = await api.get('/v1/me');
            Alert.alert('Me', JSON.stringify(res.data, null, 2));
          }} />
          <Button title="Logout" onPress={logout} />
        </>
      ) : (
        <>
          <Text>Logged out</Text>
          <Button title="Login" onPress={login} />
        </>
      )}
    </SafeAreaView>
  );
}

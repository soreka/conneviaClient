import React from "react";
import { View, Text } from "react-native";
import * as AuthSession from "expo-auth-session";

export default function DebugRedirectUri() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "connevia",     // must match app.json
    path: "login-callback", // any path you like
    useProxy: false,        // 👈 this is the key change
  });

  console.log(redirectUri);
  

  return (
    <View style={{ padding: 20 }}>
      <Text selectable style={{ fontSize: 16, fontWeight: "bold" }}>
        Redirect URI:
      </Text>
      <Text selectable style={{ fontSize: 14, marginTop: 8 }}>
        {redirectUri}
      </Text>
    </View>
  );
}

import React from "react";
import { View, Text } from "react-native";
import Constants from 'expo-constants';

export default function DebugEnv(): JSX.Element {
    const extra = Constants.expoConfig?.extra;
    console.log("DebugEnv");
    console.log(extra);
  return (
    <View className="p-4 flex-1 justify-center items-center">
    <Text selectable className="text-lg font-bold">Environment Variables:</Text>
    <Text selectable className="text-lg font-bold">Extra:</Text>
    <Text selectable className="font-semibold text-red-500">{JSON.stringify(extra)}</Text>
    
      {/* <Text selectable className="font-semibold">EXPO_PUBLIC_API_URL: {String(process.env.EXPO_PUBLIC_API_URL)}</Text>
      <Text selectable className="font-semibold">EXPO_PUBLIC_AUTH0_DOMAIN: {String(process.env.EXPO_PUBLIC_AUTH0_DOMAIN)}</Text>
      <Text selectable className="font-semibold">EXPO_PUBLIC_AUTH0_CLIENT_ID: {String(process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID)}</Text>
      <Text selectable className="font-semibold">EXPO_PUBLIC_AUTH0_AUDIENCE: {String(process.env.EXPO_PUBLIC_AUTH0_AUDIENCE)}</Text> */}
    </View>
  );
}

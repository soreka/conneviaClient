import React from "react";
import { Alert, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useAuth } from "../../src/auth/useAuth";
import { api } from "../../src/api";

export default function AuthTestScreen(): JSX.Element {
  const { accessToken, isLoading, error, login, logout, redirectUri } = useAuth();

  async function callMe(): Promise<void> {
    const res = await api.get("/v1/me");
    Alert.alert("Me", JSON.stringify(res.data, null, 2));
  }

  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-lg text-gray-500 mb-4">Redirect: {redirectUri}</Text>

      {isLoading && <ActivityIndicator />}

      {error && <Text className="text-red-600 mb-2">{error}</Text>}

      {accessToken ? (
        <>
          <Text className="text-green-700 mb-3">Logged in ✅</Text>
          <Pressable onPress={() => void callMe()} className="bg-primary-600 rounded-xl px-4 py-3 mb-3">
            <Text className="text-white font-semibold">Call /v1/me</Text>
          </Pressable>
          <Pressable onPress={() => void logout()} className="bg-gray-800 rounded-xl px-4 py-3">
            <Text className="text-white font-semibold">Logout</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => void login()} className="bg-primary-600 rounded-xl px-4 py-3">
          <Text className="text-white font-semibold">Login with Auth0</Text>
        </Pressable>
      )}
    </View>
  );
}

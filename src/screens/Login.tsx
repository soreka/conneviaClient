import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth } from "../auth/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {  user, login, logout, refreshMe, accessToken, isLoading, error } = useAuth();
  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("تنبيه", "رجاءً أدخلي البريد الإلكتروني وكلمة المرور");
      return;
    }


    setTimeout(() => {
      Alert.alert("أهلاً بك! 💜", "تم تسجيل الدخول بنجاح");
      // TODO: بعد إضافة نظام تنقّل، يمكنك التوجيه لصفحة الـ Dashboard هنا.
    }, 1500);
  }

  function handleForgotPassword() {
    Alert.alert("قريباً", "سيتم إضافة ميزة استرجاع كلمة المرور لاحقاً.");
  }

  function handleGoToRegister() {
    Alert.alert("تنبيه", "سيتم إضافة صفحة إنشاء حساب جديد لاحقاً.");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="min-h-screen     bg-gradient-to-b from-accent to-background flex flex-col p-4"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="bg-violet-300"
      >
        <View className="flex-1 px-4 py-6">
          <View className="items-center mb-8 mt-4">
            <Text className="text-lg font-semibold">تسجيل الدخول</Text>
          </View>

          <View className="flex-1 justify-center">
            <View className="bg-background rounded-3xl p-6 shadow-md">
              <View className="mb-4">
                <Text className="text-2xl text-center font-semibold mb-1">
                  مرحباً بعودتك
                </Text>
                <Text className="text-center text-gray-500">
                  سجلي الدخول لمتابعة حجوزاتك واشتراكك
                </Text>
              </View>

              <View className="space-y-4">
                <View className="mb-4">
                  <Text className="mb-1 font-medium">البريد الإلكتروني</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="example@email.com"
                    className="h-12 px-3 rounded-2xl border border-gray-300 bg-white"
                  />
                </View>
                

                <View className="mb-2">
                  <Text className="mb-1 font-medium">كلمة المرور</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="••••••••"
                    className="h-12 px-3 rounded-2xl border border-gray-300 bg-white"
                  />
                </View>

                <View className="items-start mb-4">
                  <Pressable onPress={handleForgotPassword}>
                    <Text className="text-sm text-primary font-medium">
                      نسيت كلمة المرور؟
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  className="h-12 rounded-2xl bg-primary items-center justify-center mb-3"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-white text-lg font-semibold">
                      تسجيل الدخول
                    </Text>
                  )}
                </Pressable>

                <View className="items-center">
                  <Text className="text-sm text-gray-600">
                    ليس لديك حساب؟
                    <Text
                      className="text-primary font-semibold"
                      onPress={handleGoToRegister}
                    >
                      {" "}
                      إنشاء حساب جديد
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
            {isLoading && <ActivityIndicator className="mb-3" />}
            {error && <Text className="text-red-500 mb-3">{error}</Text>}
                  {accessToken ? (
        <>
                  {user && 
                  <Text className="mt-2">
                    Logged In as {user.email ?? user.id} ({user.role})
                  </Text>
                  }

          <Pressable
            onPress={() => void refreshMe()}
            className="bg-primary-600 rounded-xl px-4 py-3 mb-2"
          >
            <Text className="text-white font-semibold">Check /v1/me</Text>
          </Pressable>

          <Pressable
            onPress={() => void logout()}
            className="bg-gray-800 rounded-xl px-4 py-3"
          >
            <Text className="text-white font-semibold">Logout</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() => void login()}
          className="bg-primary-600 rounded-xl px-4 py-3"
        >
          <Text className="text-white font-semibold text-center">
            Login with Auth0
          </Text>
        </Pressable>
      )}

        <View className="flex-1 items-center justify-center">
          <Text className="text-lg font-semibold">Login</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

import React, { useState, useEffect } from "react";
// Role: Auth UI station that triggers Auth0 login via useAuth and syncs local auth state into Redux.
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
import { useAppDispatch } from "../app/hooks";
import { setCredentials, logout as logoutAction } from "../features/auth/authSlice";
import { decodeAccessToken } from "../utils/tokenUtils";

const Login = () => {
  const { user, login, logout, accessToken, isLoading, error } = useAuth();
  const dispatch = useAppDispatch();

  // Automatically dispatch to Redux when both token and user are available
  useEffect(() => { 
    if (accessToken && user) {
      // Decode token to extract role
      const decoded = decodeAccessToken(accessToken);
      const role = decoded?.role ?? 'consumer';
      
      if (__DEV__) {
        console.log('[Auth] Login - decoded role:', role);
      }
      
      dispatch(setCredentials({ token: accessToken, user, role }));
    }
  }, [accessToken, user, dispatch]);

  const handleLogout = async () => {
    await logout(); // Clear Auth0 session
    dispatch(logoutAction()); // Clear Redux state
  };

  

  function handleForgotPassword() {
    Alert.alert("قريباً", "سيتم إضافة ميزة استرجاع كلمة المرور لاحقاً.");
  }

  function handleGoToRegister() {
    Alert.alert("تنبيه", "سيتم إضافة صفحة إنشاء حساب جديد لاحقاً.");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="min-h-screen     bg-gradient-to-b from-accent to-background flex flex-col justify-center content-center p-4"
    >
     
       
            {isLoading && <ActivityIndicator className="mb-3" />}
            {error && <Text className="text-red-500 mb-3">{error}</Text>}
                  {accessToken ? (
        <>
                  {user && 
                  <Text className="mt-2 text-right">
                    تم تسجيل الدخول كـ {user.email ?? user.id} ({user.role === 'admin' ? 'مديرة' : 'مستخدمة'})
                  </Text>
                  }

          <Pressable
            onPress={() => void handleLogout()}
            className="bg-gray-800 rounded-xl px-4 py-3"
          >
            <Text className="text-white font-semibold">تسجيل الخروج</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() => void login()}
          className="bg-primary-600 rounded-xl px-4 py-3"
        >
          <Text className="text-white font-semibold text-center">
            تسجيل الدخول
          </Text>
        </Pressable>
      )}

       
      
    </KeyboardAvoidingView>
  );
};

export default Login;

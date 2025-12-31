import { useState } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Alert } from "react-native";
import { ArrowRight, Mail, Lock } from "lucide-react-native";
import { Button } from "../../components/UI/Button";
import { AppInput } from "../../components/UI/AppInput";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/UI/Card";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);

    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert("أهلاً بك! 💜", "تم تسجيل الدخول بنجاح");
      // TODO: Navigate to dashboard when navigation is set up
      // navigation.navigate("Dashboard");
    }, 1500);
  };

  const handleForgotPassword = () => {
    Alert.alert("سيتم إضافة هذه الميزة قريباً");
  };

  const handleRegister = () => {
    // TODO: Navigate to register screen when navigation is set up
    // navigation.navigate("Register");
    Alert.alert("التسجيل", "سيتم إضافة شاشة التسجيل قريباً");
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-teal-50">
      
      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
       
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center"
            onPress={() => {
              // TODO: Navigate back when navigation is set up
              // navigation.goBack();
            }}
          >
            <ArrowRight size={20} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">تسجيل الدخول</Text>
          <View className="w-10" />
        </View>

        {/* Login Form */}
         <View className="flex-1 items-center justify-center">
          <Card className="w-full max-w-md shadow-xl border-0 elevation-5">
            <CardHeader className="gap-1 pb-4">
              <CardTitle className="text-2xl text-center">
                مرحباً بعودتك
              </CardTitle>
              <CardDescription className="text-center">
                سجلي الدخول لمتابعة حجوزاتك واشتراكك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-4">
                {/* Email */}
                 <View className="gap-2">
                  <Text className="text-sm font-medium">البريد الإلكتروني</Text>
                  <View className="relative">
                    <View className="absolute right-3 top-3 z-10">
                      <Mail size={20} color="#9ca3af" />
                    </View>
                    <AppInput
                      placeholder="البريد@مثال.com"
                      value={email}
                      onChangeText={setEmail}
                      className="pr-10 h-12"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>  

                {/* Password */}
               <View className="gap-2">
                  <Text className="text-sm font-medium">كلمة المرور</Text>
                  <View className="relative">
                    <View className="absolute right-3 top-3 z-10">
                      <Lock size={20} color="#9ca3af" />
                    </View>
                    <AppInput
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      className="pr-10 h-12"
                      secureTextEntry
                    />
                  </View>
                </View> 

                {/* Forgot Password */}
                <View className="items-start">
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text className="text-sm text-teal-600">
                      نسيت كلمة المرور؟
                    </Text>
                  </TouchableOpacity>
                </View> 

                {/* Submit Button */}
                 <Button
                  onPress={handleLogin}
                  className="w-full h-12"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? "جاري التحميل..." : "تسجيل الدخول"}
                </Button> 

                {/* Register Link */}
                 <View className="flex-row items-center justify-center">
                  <Text className="text-sm text-gray-600">
                    ليس لديك حساب؟{" "}
                  </Text>
                  <TouchableOpacity onPress={handleRegister}>
                    <Text className="text-sm text-teal-600 font-medium">
                      إنشاء حساب جديد
                    </Text>
                  </TouchableOpacity>
                </View>
              </View> 
          </CardContent> 
           </Card> 
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;

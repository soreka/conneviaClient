import React, { useEffect, useState } from "react";
import "./global.css";
import { verifyInstallation } from 'nativewind';
import { SafeAreaView, View, Text, Pressable, ActivityIndicator } from "react-native";
import DebugRedirectUri from "./src/screens/debugRedirectUri";
// connevia/App.tsx (imports)
import { SafeAreaProvider } from "react-native-safe-area-context";

import Rainy from "./src/rainy";
import AuthTestScreen from "./src/screens/AuthTestScreen";
import DebugEnv from "./src/screens/DebugEnv";
import TryOut from "./src/screens/TryOut";
import Login from "./src/screens/Login";
// const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://connevia.onrender.com"; // ← replace with your IP, e.g. http://192.168.1.23:4000

export default function App() {
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [db, setDb] = useState<string | null>(null);

  
  async function ping() {
    const url = `${ENV.API_URL}/health`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(data);
  }
  
  verifyInstallation();

  useEffect(() => { ping(); }, []);

  return (

    <SafeAreaProvider className="">
      <View className="flex-1 items-center justify-center"> 
       <Login />
      
      </View>

  </SafeAreaProvider>
  );
}

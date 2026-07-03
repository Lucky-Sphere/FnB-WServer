import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { useEffect } from "react";
import { CartProvider } from "../contexts/CartContext";
import { setToken, settings } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem("token");
        if (t) setToken(t);
        await settings.fetch();
      } catch (e) {
        console.warn("init failed", e);
      }
    })();
  }, []);

  return (
    <CartProvider>
      <StatusBar barStyle="dark-content" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" options={{ headerShown: true, title: "Login" }} />

        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order/[id]" options={{ headerShown: true, title: "Order Details" }} />
      </Stack>
    </CartProvider>
  );
}

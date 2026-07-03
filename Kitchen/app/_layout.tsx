import { View, StatusBar, StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 0;

export default function KitchenLayout() {
  return (
    <View style={[styles.root, { paddingTop: STATUS_BAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});

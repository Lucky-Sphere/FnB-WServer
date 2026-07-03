import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { auth, setToken } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function KitchenLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res: any = await auth.login(username, password);
      if (res.user.role !== "kitchen") {
        Alert.alert("Access Denied", "Only kitchen staff can use this app.");
        return;
      }
      setToken(res.token);
      if (remember) {
        await AsyncStorage.setItem("kitchen_token", res.token);
      } else {
        await AsyncStorage.removeItem("kitchen_token");
      }
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kitchen Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#999"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.row} onPress={() => setRemember(!remember)}>
        <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
          {remember && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.rememberText}>Remember me</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#f5f5f5" },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 40, color: "#333" },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 14,
    fontSize: 16, marginBottom: 16, backgroundColor: "#fff", color: "#333",
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: "#4CAF50", justifyContent: "center", alignItems: "center", marginRight: 10 },
  checkboxChecked: { backgroundColor: "#4CAF50" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  rememberText: { color: "#555", fontSize: 14 },
  button: { backgroundColor: "#4CAF50", padding: 16, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

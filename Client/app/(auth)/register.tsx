import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { auth, setToken } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Register() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res: any = await auth.register(username, password, name);
      if (res.user.role !== "customer") {
        Alert.alert("Access Denied", "Only customer accounts can use this app.");
        return;
      }
      setToken(res.token);
      await AsyncStorage.setItem("token", res.token);
      router.replace("/(tabs)/menu");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input} placeholder="Name" value={name} onChangeText={setName}
      />
      <TextInput
        style={styles.input} placeholder="Username" value={username} onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input} placeholder="Password" value={password}
        onChangeText={setPassword} secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 40 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 14,
    fontSize: 16, marginBottom: 16, backgroundColor: "#f9f9f9",
  },
  button: { backgroundColor: "#4CAF50", padding: 16, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { color: "#4CAF50", textAlign: "center", marginTop: 16, fontSize: 14 },
});

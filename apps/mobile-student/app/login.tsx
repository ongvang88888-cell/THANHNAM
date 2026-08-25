import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/lib/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("student@edu.local");
  const [password, setPassword] = useState("Password123!");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Đăng nhập học viên</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#F5E6A8" />
        ) : (
          <Text style={styles.btnText}>Tiếp tục</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F3E9", padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0B3D2E", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D9E2DC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  btn: {
    backgroundColor: "#0B3D2E",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#F5E6A8", fontWeight: "700" },
  error: { color: "#8B1E1E" },
});

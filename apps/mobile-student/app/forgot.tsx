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
import { api } from "../src/lib/api";

export default function ForgotScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api.forgot(email.trim());
      if (res.resetToken) {
        router.push({ pathname: "/reset", params: { token: res.resetToken } });
        return;
      }
      setMsg("Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Quên mật khẩu</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {msg && <Text style={styles.ok}>{msg}</Text>}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={busy}>
        {busy ? <ActivityIndicator color="#F5E6A8" /> : <Text style={styles.btnText}>Gửi link</Text>}
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
  ok: { color: "#0B3D2E" },
});

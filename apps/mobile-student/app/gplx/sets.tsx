import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";

export default function GplxSetsScreen() {
  const { licenseClass = "B" } = useLocalSearchParams<{ licenseClass?: string }>();
  const { token, ready } = useAuth();
  const [items, setItems] = useState<
    Array<{
      id: string;
      code: string;
      title: string;
      licenseClass: string;
      questionCount: number;
    }>
  >([]);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    api
      .gplxFixedSets(token, String(licenseClass))
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, licenseClass]);

  async function start(setId: string) {
    if (!token) return;
    setStarting(setId);
    try {
      const res = await api.gplxStartMock(token, String(licenseClass), "fixed", setId);
      router.push(`/gplx/exam/${res.attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được đề");
      setStarting(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Bộ đề cố định" }} />
      <ScrollView contentContainerStyle={styles.screen}>
        {error && <Text style={styles.error}>{error}</Text>}
        {items.length === 0 && !error && <ActivityIndicator color="#0B3D2E" />}
        {items.map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.meta}>
              {s.licenseClass} · {s.questionCount} câu
            </Text>
            <Pressable
              style={styles.btn}
              disabled={starting === s.id}
              onPress={() => void start(s.id)}
            >
              <Text style={styles.btnText}>
                {starting === s.id ? "…" : "Làm đề"}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 12, backgroundColor: "#F4F1E8", paddingBottom: 48 },
  card: {
    backgroundColor: "#FFFEFA",
    borderColor: "rgba(11,61,46,0.12)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0B3D2E" },
  meta: { color: "#5C6B63" },
  btn: {
    marginTop: 8,
    backgroundColor: "#0B3D2E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#F5E6A8", fontWeight: "700" },
  error: { color: "#8B2E2E" },
});

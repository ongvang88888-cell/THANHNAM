import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";

export default function GplxFlashcardsScreen() {
  const { licenseClass = "B", kind } = useLocalSearchParams<{
    licenseClass?: string;
    kind?: string;
  }>();
  const { token, ready } = useAuth();
  const [items, setItems] = useState<
    Array<{ id: string; front: string; back: string; kind: string }>
  >([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    api
      .gplxFlashcards(token, String(licenseClass), kind ? String(kind) : undefined)
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, licenseClass, kind]);

  const card = items[idx];

  return (
    <>
      <Stack.Screen options={{ title: "Flashcard" }} />
      <View style={styles.screen}>
        {error && <Text style={styles.error}>{error}</Text>}
        {!card && !error && <ActivityIndicator color="#0B3D2E" />}
        {card && (
          <>
            <Pressable
              style={styles.card}
              onPress={() => setFlipped((f) => !f)}
            >
              <Text style={styles.meta}>
                {card.kind} · {idx + 1}/{items.length} · chạm để lật
              </Text>
              <Text style={styles.body}>{flipped ? card.back : card.front}</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable
                style={styles.btnGhost}
                disabled={idx === 0}
                onPress={() => {
                  setIdx((i) => i - 1);
                  setFlipped(false);
                }}
              >
                <Text style={styles.btnGhostText}>Trước</Text>
              </Pressable>
              <Pressable
                style={styles.btnGhost}
                disabled={idx >= items.length - 1}
                onPress={() => {
                  setIdx((i) => i + 1);
                  setFlipped(false);
                }}
              >
                <Text style={styles.btnGhostText}>Sau</Text>
              </Pressable>
            </View>
          </>
        )}
        <Pressable style={styles.btnGhost} onPress={() => router.back()}>
          <Text style={styles.btnGhostText}>Quay lại</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 12, backgroundColor: "#F4F1E8" },
  card: {
    backgroundColor: "#FFFEFA",
    borderColor: "rgba(11,61,46,0.12)",
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    minHeight: 180,
    gap: 10,
  },
  meta: { color: "#5C6B63" },
  body: { fontSize: 16, lineHeight: 24, color: "#0B3D2E", fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#0B3D2E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  btnGhostText: { color: "#0B3D2E", fontWeight: "600" },
  error: { color: "#8B2E2E" },
});

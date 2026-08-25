import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";

type LibProduct = {
  id: string;
  name: string;
  slug: string;
  type: string;
  course?: { id: string } | null;
  document?: { id: string } | null;
};

export default function LibraryScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<LibProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Cần đăng nhập để xem thư viện.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.myLibrary(token);
        if (!cancelled) setItems(data.products);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function openItem(item: LibProduct) {
    if (!token) return;
    setMsg(null);
    if (item.type === "DIGITAL_DOCUMENT" && item.document?.id) {
      try {
        const doc = await api.documentContent(token, item.document.id);
        setMsg(`${doc.title}: ${doc.url.slice(0, 64)}…`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Document failed");
      }
      return;
    }
    router.push(`/product/${item.slug}`);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Thư viện của tôi</Text>
      {loading && <ActivityIndicator color="#0B3D2E" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openItem(item)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.type}
              {item.type === "DIGITAL_DOCUMENT" ? " · tap to download URL" : " · open product"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F3E9", padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0B3D2E" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D9E2DC",
  },
  cardTitle: { fontWeight: "700", color: "#122018" },
  meta: { color: "#5A6B63", marginTop: 4 },
  error: { color: "#8B1E1E" },
  msg: { color: "#0B3D2E" },
});

import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";

export default function LibraryScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<
    Array<{ id: string; name: string; slug: string; type: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Thư viện của tôi</Text>
      {loading && <ActivityIndicator color="#0B3D2E" />}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.meta}>{item.type}</Text>
          </View>
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
});

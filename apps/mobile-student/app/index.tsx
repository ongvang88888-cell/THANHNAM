import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, type ProductListItem } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";

export default function CatalogScreen() {
  const { token, user, signOut } = useAuth();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listProducts();
        if (!cancelled) setProducts(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>EduCommerce</Text>
      <Text style={styles.sub}>
        {user ? `Xin chào, ${user.email}` : "Khóa học · Tài liệu · Bundle"}
      </Text>
      <View style={styles.row}>
        {token ? (
          <Pressable onPress={signOut} style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>Đăng xuất</Text>
          </Pressable>
        ) : (
          <Link href="/login" asChild>
            <Pressable style={styles.btn}>
              <Text style={styles.btnText}>Đăng nhập</Text>
            </Pressable>
          </Link>
        )}
        <Link href="/library" asChild>
          <Pressable style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>Thư viện</Text>
          </Pressable>
        </Link>
      </View>

      {loading && <ActivityIndicator color="#0B3D2E" />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Link href={`/product/${item.slug}`} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.type} ·{" "}
                {item.price
                  ? `${item.price.amountMinor.toLocaleString("vi-VN")}₫`
                  : "—"}
              </Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F3E9",
    padding: 20,
    gap: 12,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0B3D2E",
    letterSpacing: -0.5,
  },
  sub: { color: "#3D4A44", fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  btn: {
    backgroundColor: "#0B3D2E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: { color: "#F5E6A8", fontWeight: "700" },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#0B3D2E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnGhostText: { color: "#0B3D2E", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9E2DC",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#122018" },
  cardMeta: { marginTop: 6, color: "#5A6B63" },
  error: { color: "#8B1E1E" },
});

import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type ProductDetail } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.getProduct(slug).then(setProduct).catch((e) => setMsg(String(e)));
  }, [slug]);

  async function buy() {
    if (!token || !product) {
      setMsg("Đăng nhập trước khi mua.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.checkout(token, product.id);
      setMsg(
        `Đơn hàng: ${result.order.status}${result.fulfilled ? " — đã cấp quyền" : ""}`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (!product) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color="#0B3D2E" />
        {msg && <Text style={styles.error}>{msg}</Text>}
      </View>
    );
  }

  const price = product.prices[0];

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.meta}>
        {product.type} · {price ? `${price.amountMinor.toLocaleString("vi-VN")}₫` : "—"}
      </Text>
      <Text style={styles.desc}>{product.description}</Text>
      <Pressable style={styles.btn} onPress={buy} disabled={busy}>
        <Text style={styles.btnText}>{busy ? "Đang xử lý…" : "Mua (Mock)"}</Text>
      </Pressable>
      {msg && <Text style={styles.msg}>{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F3E9", padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0B3D2E" },
  meta: { color: "#5A6B63" },
  desc: { color: "#3D4A44", lineHeight: 22 },
  btn: {
    backgroundColor: "#C4A035",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#1A1508", fontWeight: "800" },
  msg: { color: "#0B3D2E" },
  error: { color: "#8B1E1E" },
});

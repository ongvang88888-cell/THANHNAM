import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { api, type ProductDetail } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";

/**
 * Play Billing purchase path:
 * 1) checkout provider=google_play → SKU
 * 2) On device: react-native-iap / expo-in-app-purchases (wire in EAS build)
 * 3) Dev / Expo Go: confirm with gp_test_* token
 */
export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<"mock" | "google_play">(
    Platform.OS === "android" ? "google_play" : "mock"
  );

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
    setMsg(null);
    try {
      const result = await api.checkout(token, product.id, provider);
      if (provider === "mock") {
        setMsg(
          `Đơn hàng: ${result.order.status}${result.fulfilled ? " — đã cấp quyền" : ""}`
        );
        return;
      }

      const sku = result.intent?.clientAction?.sku || product.metadataJson?.playSku || product.slug;
      // Production: launch Play Billing BillingClient.launchBillingFlow({ sku })
      // Dev bridge: confirm test token so entitlement pipeline is verified end-to-end.
      const purchaseToken = `gp_test_${result.order.id}_${Date.now()}`;
      const confirmed = await api.confirmGooglePlay(token, {
        orderId: result.order.id,
        purchaseToken,
        productId: sku,
      });
      setMsg(
        `Play Billing (${sku}): ${confirmed.order.status}` +
          (confirmed.fulfilled ? " — entitlement granted" : "")
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

      <Text style={styles.label}>Provider</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, provider === "mock" && styles.chipOn]}
          onPress={() => setProvider("mock")}
        >
          <Text style={[styles.chipText, provider === "mock" && styles.chipTextOn]}>Mock</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, provider === "google_play" && styles.chipOn]}
          onPress={() => setProvider("google_play")}
        >
          <Text style={[styles.chipText, provider === "google_play" && styles.chipTextOn]}>
            Google Play
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.btn} onPress={buy} disabled={busy}>
        <Text style={styles.btnText}>
          {busy ? "Đang xử lý…" : provider === "google_play" ? "Mua (Play Billing)" : "Mua (Mock)"}
        </Text>
      </Pressable>

      {product.course?.sections?.[0]?.lessons?.[0]?.id && (
        <Pressable
          style={styles.linkBtn}
          onPress={() =>
            router.push(`/learn/${product.course!.sections![0].lessons![0].id}`)
          }
        >
          <Text style={styles.linkText}>Mở bài học đầu</Text>
        </Pressable>
      )}

      {msg && <Text style={styles.msg}>{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F3E9", padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0B3D2E" },
  meta: { color: "#5A6B63" },
  desc: { color: "#3D4A44", lineHeight: 22 },
  label: { color: "#5A6B63", fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#0B3D2E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipOn: { backgroundColor: "#0B3D2E" },
  chipText: { color: "#0B3D2E", fontWeight: "700" },
  chipTextOn: { color: "#F5E6A8" },
  btn: {
    backgroundColor: "#C4A035",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#1A1508", fontWeight: "800" },
  linkBtn: { paddingVertical: 10 },
  linkText: { color: "#0B3D2E", fontWeight: "700", textDecorationLine: "underline" },
  msg: { color: "#0B3D2E" },
  error: { color: "#8B1E1E" },
});

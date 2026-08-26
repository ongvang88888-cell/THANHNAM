import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, type ProductDetail } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import {
  defaultProviderForPlatform,
  purchaseStoreProduct,
  type StoreProvider,
} from "../../src/lib/iap";

/**
 * Store purchase path (Play / Apple / Mock):
 * 1) checkout → intent with SKU (+ appAccountToken on Apple)
 * 2) purchaseStoreProduct (native IAP or gp_test_/iap_test_ bridge)
 * 3) confirm endpoint → entitlement grant
 */
export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<StoreProvider>(defaultProviderForPlatform());

  useEffect(() => {
    if (!slug) return;
    api.getProduct(slug).then(setProduct).catch((e) => setMsg(String(e)));
  }, [slug]);

  async function buy() {
    if (!token || !product) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const result = await api.checkout(token, product.id, provider);
      if (provider === "mock") {
        setMsg(
          `Đơn hàng: ${result.order.status}${result.fulfilled ? " — đã cấp quyền" : ""}`,
        );
        return;
      }

      const sku =
        result.intent?.clientAction?.sku ||
        (provider === "apple_iap"
          ? product.metadataJson?.appleSku
          : product.metadataJson?.playSku) ||
        product.slug;

      const purchased = await purchaseStoreProduct({
        provider,
        sku,
        orderId: result.order.id,
        appAccountToken: result.intent?.clientAction?.appAccountToken,
      });

      if (provider === "google_play") {
        const confirmed = await api.confirmGooglePlay(token, {
          orderId: result.order.id,
          purchaseToken: purchased.token,
          productId: sku,
        });
        setMsg(
          `Play (${sku}, ${purchased.mode}): ${confirmed.order.status}` +
            (confirmed.fulfilled ? " — entitlement granted" : ""),
        );
        return;
      }

      const confirmed = await api.confirmAppleIap(token, {
        orderId: result.order.id,
        transactionId: purchased.token,
        productId: sku,
        signedTransaction: purchased.signedTransaction,
      });
      setMsg(
        `Apple IAP (${sku}, ${purchased.mode}): ${confirmed.order.status}` +
          (confirmed.fulfilled ? " — entitlement granted" : ""),
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
  const buyLabel =
    provider === "google_play"
      ? "Mua (Play Billing)"
      : provider === "apple_iap"
        ? "Mua (Apple IAP)"
        : "Mua (Mock)";

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.meta}>
        {product.type} · {price ? `${price.amountMinor.toLocaleString("vi-VN")}₫` : "—"}
      </Text>
      <Text style={styles.desc}>{product.description}</Text>

      <Text style={styles.label}>Provider</Text>
      <View style={styles.row}>
        {(
          [
            ["mock", "Mock"],
            ["google_play", "Google Play"],
            ["apple_iap", "Apple IAP"],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            style={[styles.chip, provider === id && styles.chipOn]}
            onPress={() => setProvider(id)}
          >
            <Text style={[styles.chipText, provider === id && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.btn} onPress={buy} disabled={busy}>
        <Text style={styles.btnText}>{busy ? "Đang xử lý…" : buyLabel}</Text>
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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

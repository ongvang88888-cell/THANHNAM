import { Link, Stack, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

const CLASSES = [
  "A1",
  "A",
  "B1",
  "B",
  "C1",
  "C",
  "D1",
  "D2",
  "D",
  "BE",
  "CE",
  "DE",
];

export default function GplxHomeScreen() {
  const { token, ready } = useAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.gplxOverview>> | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const overview = await api.gplxOverview(token, licenseClass);
      setData(overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải");
    } finally {
      setLoading(false);
    }
  }, [token, licenseClass]);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setLoading(false);
      setError("Cần đăng nhập để ôn GPLX.");
      return;
    }
    void load();
  }, [ready, token, load]);

  async function startMock(mode: "random" | "critical_only" = "random") {
    if (!token) return;
    setStarting(true);
    setError(null);
    try {
      const res = await api.gplxStartMock(token, licenseClass, mode);
      router.push(`/gplx/exam/${res.attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được đề");
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Ôn GPLX" }} />
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.brand}>GPLX 2026</Text>
        <Text style={styles.sub}>Ôn lý thuyết · Thi thử theo hạng bằng</Text>

        <Text style={styles.label}>Hạng bằng</Text>
        <View style={styles.row}>
          {CLASSES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setLicenseClass(c)}
              style={[styles.chip, licenseClass === c && styles.chipOn]}
            >
              <Text style={[styles.chipText, licenseClass === c && styles.chipTextOn]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && <ActivityIndicator color="#0B3D2E" />}
        {error && <Text style={styles.error}>{error}</Text>}

        {data && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Tiến độ · {data.stats.mastered}/{data.stats.totalQuestions} thuộc
              </Text>
              <Text style={styles.meta}>
                Sai: {data.stats.wrong} · Liệt: {data.stats.criticalCount}
                {data.streak
                  ? ` · Chuỗi ${data.streak.currentStreak} ngày`
                  : ""}
              </Text>
              <Text style={styles.meta}>
                {data.isPro
                  ? "Pro: thi không giới hạn"
                  : `Free: còn ${data.mocksRemainingToday ?? 0}/${data.freeMocksPerDay} đề/ngày`}
              </Text>
              <Pressable
                style={styles.btn}
                onPress={() => void startMock("random")}
                disabled={starting}
              >
                <Text style={styles.btnText}>
                  {starting ? "Đang tạo…" : "Đề ngẫu nhiên"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.btnGhost}
                onPress={() => void startMock("critical_only")}
                disabled={starting}
              >
                <Text style={styles.btnGhostText}>Chỉ câu điểm liệt</Text>
              </Pressable>
              <Link href={`/gplx/flashcards?licenseClass=${licenseClass}`} asChild>
                <Pressable style={styles.btnGhost}>
                  <Text style={styles.btnGhostText}>Flashcard</Text>
                </Pressable>
              </Link>
              <Link href={`/gplx/sets?licenseClass=${licenseClass}`} asChild>
                <Pressable style={styles.btnGhost}>
                  <Text style={styles.btnGhostText}>Bộ đề cố định</Text>
                </Pressable>
              </Link>
              {!data.isPro && data.proProduct && (
                <Link href={`/product/${data.proProduct.slug}`} asChild>
                  <Pressable style={styles.btnGhost}>
                    <Text style={styles.btnGhostText}>Nâng cấp {data.proProduct.name}</Text>
                  </Pressable>
                </Link>
              )}
            </View>

            <Text style={styles.section}>Chuyên đề</Text>
            {data.topics.map((t) => (
              <Link key={t.id} href={`/gplx/topic/${t.id}?licenseClass=${licenseClass}`} asChild>
                <Pressable style={styles.card}>
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <Text style={styles.meta}>{t.questionCount} câu</Text>
                </Pressable>
              </Link>
            ))}
          </>
        )}

        {!token && (
          <Link href="/login" asChild>
            <Pressable style={styles.btn}>
              <Text style={styles.btnText}>Đăng nhập</Text>
            </Pressable>
          </Link>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 12, backgroundColor: "#F4F1E8", paddingBottom: 48 },
  brand: { fontSize: 28, fontWeight: "800", color: "#0B3D2E" },
  sub: { color: "#5C6B63", marginBottom: 8 },
  label: { fontWeight: "700", color: "#0B3D2E" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#0B3D2E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipOn: { backgroundColor: "#0B3D2E" },
  chipText: { color: "#0B3D2E", fontWeight: "600" },
  chipTextOn: { color: "#F5E6A8" },
  card: {
    backgroundColor: "#FFFEFA",
    borderColor: "rgba(11,61,46,0.12)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0B3D2E" },
  meta: { color: "#5C6B63" },
  section: { marginTop: 8, fontSize: 18, fontWeight: "700", color: "#0B3D2E" },
  btn: {
    marginTop: 8,
    backgroundColor: "#0B3D2E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#F5E6A8", fontWeight: "700" },
  btnGhost: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#0B3D2E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnGhostText: { color: "#0B3D2E", fontWeight: "600" },
  error: { color: "#8B2E2E" },
});

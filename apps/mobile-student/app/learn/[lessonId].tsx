import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";

export default function LearnScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { token } = useAuth();
  const [lesson, setLesson] = useState<{
    id: string;
    title: string;
    access: { code: string };
    contents: Array<{ id: string; body?: string | null }>;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token || !lessonId) return;
    const data = await api.getLesson(token, lessonId);
    setLesson(data);
  }

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    load().catch((e) => setMsg(String(e)));
  }, [token, lessonId]);

  async function watchAd() {
    if (!token || !lesson) return;
    setBusy(true);
    try {
      const elig = await api.rewardEligibility(token, lesson.id);
      if (!elig.eligible || !elig.rewardSessionId) {
        setMsg(elig.reason || "Not eligible");
        return;
      }
      await api.rewardDevComplete(token, elig.rewardSessionId);
      await load();
      setMsg("Unlocked via rewarded ad");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!lesson) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color="#0B3D2E" />
        {msg && <Text style={styles.error}>{msg}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.meta}>{lesson.access.code}</Text>
      {lesson.access.code !== "CAN_ACCESS" && (
        <Pressable style={styles.btn} onPress={watchAd} disabled={busy}>
          <Text style={styles.btnText}>{busy ? "..." : "Xem quảng cáo mở khóa"}</Text>
        </Pressable>
      )}
      {lesson.access.code === "CAN_ACCESS" &&
        lesson.contents.map((c) => (
          <Text key={c.id} style={styles.body}>
            {c.body}
          </Text>
        ))}
      {msg && <Text style={styles.msg}>{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F3E9", padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#0B3D2E" },
  meta: { color: "#5A6B63" },
  body: { color: "#122018", lineHeight: 22 },
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

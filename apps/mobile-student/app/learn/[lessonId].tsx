import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";

export default function LearnScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { token } = useAuth();
  const [lesson, setLesson] = useState<{
    id: string;
    title: string;
    access: { code: string };
    contents: Array<{
      id: string;
      contentType?: string;
      body?: string | null;
      refId?: string | null;
    }>;
  } | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token || !lessonId) return;
    const data = await api.getLesson(token, lessonId);
    setLesson(data);
    setPlaybackUrl(null);
    if (data.access.code === "CAN_ACCESS") {
      const video = data.contents.find((c) => c.contentType === "VIDEO" && c.refId);
      if (video?.refId) {
        try {
          const pb = await api.playback(token, video.refId, data.id);
          setPlaybackUrl(pb.playbackUrl);
        } catch (e) {
          setMsg(e instanceof Error ? e.message : "Playback failed");
        }
      }
    }
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
          <View key={c.id}>
            {c.contentType === "VIDEO" ? (
              playbackUrl ? (
                <Video
                  style={styles.video}
                  source={{ uri: playbackUrl }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  onPlaybackStatusUpdate={(status) => {
                    if (!token || !("isLoaded" in status) || !status.isLoaded) return;
                    if (status.didJustFinish) {
                      void api.saveProgress(token, lesson.id, { completed: true });
                    }
                  }}
                />
              ) : (
                <Text style={styles.body}>Đang tải video…</Text>
              )
            ) : (
              <Text style={styles.body}>{c.body}</Text>
            )}
          </View>
        ))}
      {lesson.access.code === "CAN_ACCESS" && (
        <Pressable
          style={styles.btnGhost}
          onPress={() => {
            if (!token) return;
            void api
              .saveProgress(token, lesson.id, { completed: true, timeSpentMs: 30_000 })
              .then(() => setMsg("Đã lưu tiến độ"));
          }}
        >
          <Text style={styles.btnGhostText}>Đánh dấu hoàn thành</Text>
        </Pressable>
      )}
      {msg && <Text style={styles.msg}>{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F3E9", padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#0B3D2E" },
  meta: { color: "#5A6B63" },
  body: { color: "#122018", lineHeight: 22 },
  video: { width: "100%", height: 220, backgroundColor: "#0B1612" },
  btn: {
    backgroundColor: "#C4A035",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#1A1508", fontWeight: "800" },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#0B3D2E",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnGhostText: { color: "#0B3D2E", fontWeight: "700" },
  msg: { color: "#0B3D2E" },
  error: { color: "#8B1E1E" },
});

import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../../src/lib/api";
import { useAuth } from "../../../src/lib/auth";

export default function GplxExamScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [questions, setQuestions] = useState<
    Array<{
      id: string;
      stem: string;
      isCritical: boolean;
      answers: Array<{ id: string; body: string }>;
    }>
  >([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{
    passed: boolean;
    correctCount: number;
    total: number;
    failedCritical: boolean;
    licenseClass: string;
  } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token || !attemptId) return;
    (async () => {
      try {
        const data = await api.gplxGetAttempt(token, attemptId);
        if (data.submitted) {
          setResult({
            passed: !!data.passed,
            correctCount: data.correctCount ?? 0,
            total: data.total ?? 0,
            failedCritical: !!data.failedCritical,
            licenseClass: data.licenseClass,
          });
        } else {
          setQuestions(data.questions ?? []);
          setExpiresAt(data.expiresAt ?? null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, attemptId]);

  const remainSec = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  }, [expiresAt, now]);

  const submit = useCallback(async () => {
    if (!token || !attemptId || !questions.length) return;
    setBusy(true);
    try {
      const res = await api.gplxSubmitMock(
        token,
        attemptId,
        questions.map((q) => ({
          questionId: q.id,
          selectedAnswerIds: selected[q.id] ?? [],
        })),
      );
      setResult(res);
      setQuestions([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nộp bài thất bại");
    } finally {
      setBusy(false);
    }
  }, [token, attemptId, questions, selected]);

  useEffect(() => {
    if (questions.length && remainSec === 0 && !busy && !result) {
      void submit();
    }
  }, [questions.length, remainSec, busy, result, submit]);

  const q = questions[idx];
  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");

  return (
    <>
      <Stack.Screen options={{ title: "Thi thử GPLX" }} />
      <ScrollView contentContainerStyle={styles.screen}>
        {loading && <ActivityIndicator color="#0B3D2E" />}
        {error && <Text style={styles.error}>{error}</Text>}

        {result && (
          <View style={styles.card}>
            <Text style={result.passed ? styles.ok : styles.error}>
              {result.passed ? "ĐẠT" : "CHƯA ĐẠT"} — {result.correctCount}/{result.total}
            </Text>
            {result.failedCritical && (
              <Text style={styles.error}>Sai câu điểm liệt</Text>
            )}
            <Text style={styles.meta}>Hạng {result.licenseClass}</Text>
          </View>
        )}

        {q && (
          <View style={styles.card}>
            <Text style={[styles.timer, remainSec < 60 && styles.error]}>
              ⏱ {mm}:{ss}
            </Text>
            <Text style={styles.meta}>
              Câu {idx + 1}/{questions.length}
              {q.isCritical ? " · Liệt" : ""}
            </Text>
            <Text style={styles.stem}>{q.stem}</Text>
            {q.answers.map((a) => {
              const on = (selected[q.id] ?? []).includes(a.id);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setSelected((p) => ({ ...p, [q.id]: [a.id] }))}
                  style={[styles.answer, on && styles.answerOn]}
                >
                  <Text style={styles.answerText}>{a.body}</Text>
                </Pressable>
              );
            })}
            <View style={styles.row}>
              <Pressable
                style={styles.btnGhost}
                disabled={idx === 0}
                onPress={() => setIdx((i) => i - 1)}
              >
                <Text style={styles.btnGhostText}>Trước</Text>
              </Pressable>
              <Pressable
                style={styles.btnGhost}
                disabled={idx >= questions.length - 1}
                onPress={() => setIdx((i) => i + 1)}
              >
                <Text style={styles.btnGhostText}>Sau</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => void submit()} disabled={busy}>
                <Text style={styles.btnText}>{busy ? "…" : "Nộp bài"}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, backgroundColor: "#F4F1E8", paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFEFA",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(11,61,46,0.12)",
    gap: 10,
  },
  timer: { fontWeight: "800", color: "#0B3D2E", fontSize: 18 },
  meta: { color: "#5C6B63" },
  stem: { fontSize: 16, fontWeight: "600", color: "#0B3D2E", lineHeight: 22 },
  answer: {
    borderWidth: 1,
    borderColor: "#0B3D2E",
    borderRadius: 10,
    padding: 12,
  },
  answerOn: { backgroundColor: "rgba(11,61,46,0.08)" },
  answerText: { color: "#0B3D2E" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: {
    backgroundColor: "#0B3D2E",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: "#F5E6A8", fontWeight: "700" },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#0B3D2E",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnGhostText: { color: "#0B3D2E", fontWeight: "600" },
  ok: { color: "#1F6B4A", fontWeight: "800", fontSize: 18 },
  error: { color: "#8B2E2E" },
});

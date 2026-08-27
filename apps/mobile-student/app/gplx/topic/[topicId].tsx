import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

export default function GplxTopicScreen() {
  const { topicId, licenseClass: lc } = useLocalSearchParams<{
    topicId: string;
    licenseClass?: string;
  }>();
  const licenseClass = lc || "B";
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<
    Array<{
      id: string;
      stem: string;
      explanation: string;
      isCritical: boolean;
      answers: Array<{ id: string; body: string }>;
    }>
  >([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !topicId) return;
    (async () => {
      try {
        const data = await api.gplxTopicQuestions(token, topicId, licenseClass);
        setTitle(data.topic.title);
        setQuestions(data.questions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, topicId, licenseClass]);

  const q = questions[idx];

  async function check() {
    if (!token || !q || !selected) return;
    try {
      const res = await api.gplxPracticeAnswer(token, q.id, [selected]);
      setFeedback(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: title || "Chuyên đề" }} />
      <ScrollView contentContainerStyle={styles.screen}>
        {loading && <ActivityIndicator color="#0B3D2E" />}
        {error && <Text style={styles.error}>{error}</Text>}
        {q && (
          <View style={styles.card}>
            <Text style={styles.meta}>
              Câu {idx + 1}/{questions.length}
              {q.isCritical ? " · Điểm liệt" : ""}
            </Text>
            <Text style={styles.stem}>{q.stem}</Text>
            {q.answers.map((a) => (
              <Pressable
                key={a.id}
                disabled={!!feedback}
                onPress={() => setSelected(a.id)}
                style={[styles.answer, selected === a.id && styles.answerOn]}
              >
                <Text style={styles.answerText}>{a.body}</Text>
              </Pressable>
            ))}
            {!feedback ? (
              <Pressable style={styles.btn} onPress={() => void check()} disabled={!selected}>
                <Text style={styles.btnText}>Kiểm tra</Text>
              </Pressable>
            ) : (
              <>
                <Text style={feedback.correct ? styles.ok : styles.error}>
                  {feedback.correct ? "Đúng" : "Sai"}
                </Text>
                <Text style={styles.meta}>{feedback.explanation}</Text>
                <Pressable
                  style={styles.btn}
                  disabled={idx >= questions.length - 1}
                  onPress={() => {
                    setFeedback(null);
                    setSelected(null);
                    setIdx((i) => i + 1);
                  }}
                >
                  <Text style={styles.btnText}>Câu tiếp</Text>
                </Pressable>
              </>
            )}
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
  btn: {
    backgroundColor: "#0B3D2E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#F5E6A8", fontWeight: "700" },
  ok: { color: "#1F6B4A", fontWeight: "700" },
  error: { color: "#8B2E2E" },
});

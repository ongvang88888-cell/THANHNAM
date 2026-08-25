export type QuizAnswerInput = {
  questionId: string;
  selectedAnswerIds: string[];
};

export type QuizQuestionKey = {
  id: string;
  type: "mcq" | "true_false" | "multi";
  correctAnswerIds: string[];
};

export type QuizScoreResult = {
  score: number; // 0-100
  correctCount: number;
  total: number;
  details: Array<{
    questionId: string;
    correct: boolean;
    selectedAnswerIds: string[];
    correctAnswerIds: string[];
  }>;
};

/** Server-authoritative quiz scoring — never trust client score. */
export function scoreQuizAttempt(
  questions: QuizQuestionKey[],
  answers: QuizAnswerInput[],
): QuizScoreResult {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let correctCount = 0;
  const details: QuizScoreResult["details"] = [];

  for (const q of questions) {
    const selected = [...(byId.get(q.id)?.selectedAnswerIds ?? [])].sort();
    const expected = [...q.correctAnswerIds].sort();
    const correct =
      selected.length === expected.length &&
      selected.every((id, i) => id === expected[i]);
    if (correct) correctCount += 1;
    details.push({
      questionId: q.id,
      correct,
      selectedAnswerIds: selected,
      correctAnswerIds: expected,
    });
  }

  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  return { score, correctCount, total, details };
}

export function passedQuiz(score: number, passScore = 70): boolean {
  return score >= passScore;
}

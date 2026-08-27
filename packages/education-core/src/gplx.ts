/** Official-style GPLX theory exam rules (Vietnam). Tunable per class. */
export type GplxLicenseClassCode = "A1" | "A" | "B1" | "B" | "C" | "D" | "E" | "F";

export type GplxExamRules = {
  licenseClass: GplxLicenseClassCode;
  questionCount: number;
  /** Minimum correct answers required to pass (before critical-fail check). */
  passCorrectCount: number;
  durationSec: number;
  /** If true, any wrong critical (điểm liệt) question fails the exam. */
  criticalFailEnabled: boolean;
};

export const GPLX_EXAM_RULES: Record<GplxLicenseClassCode, GplxExamRules> = {
  A1: {
    licenseClass: "A1",
    questionCount: 25,
    passCorrectCount: 21,
    durationSec: 19 * 60,
    criticalFailEnabled: true,
  },
  A: {
    licenseClass: "A",
    questionCount: 25,
    passCorrectCount: 23,
    durationSec: 19 * 60,
    criticalFailEnabled: true,
  },
  B1: {
    licenseClass: "B1",
    questionCount: 30,
    passCorrectCount: 27,
    durationSec: 20 * 60,
    criticalFailEnabled: true,
  },
  B: {
    licenseClass: "B",
    questionCount: 30,
    passCorrectCount: 27,
    durationSec: 20 * 60,
    criticalFailEnabled: true,
  },
  C: {
    licenseClass: "C",
    questionCount: 40,
    passCorrectCount: 36,
    durationSec: 24 * 60,
    criticalFailEnabled: true,
  },
  D: {
    licenseClass: "D",
    questionCount: 45,
    passCorrectCount: 41,
    durationSec: 26 * 60,
    criticalFailEnabled: true,
  },
  E: {
    licenseClass: "E",
    questionCount: 45,
    passCorrectCount: 41,
    durationSec: 26 * 60,
    criticalFailEnabled: true,
  },
  F: {
    licenseClass: "F",
    questionCount: 45,
    passCorrectCount: 41,
    durationSec: 26 * 60,
    criticalFailEnabled: true,
  },
};

export function getGplxExamRules(licenseClass: string): GplxExamRules {
  const key = licenseClass.toUpperCase() as GplxLicenseClassCode;
  const rules = GPLX_EXAM_RULES[key];
  if (!rules) {
    throw new Error(`Unsupported GPLX license class: ${licenseClass}`);
  }
  return rules;
}

export type GplxScoredQuestion = {
  questionId: string;
  isCritical: boolean;
  correct: boolean;
  selectedAnswerIds: string[];
  correctAnswerIds: string[];
};

export type GplxExamScoreResult = {
  correctCount: number;
  total: number;
  /** Percent 0-100 for analytics; pass uses absolute counts + critical. */
  score: number;
  passed: boolean;
  failedCritical: boolean;
  details: GplxScoredQuestion[];
};

export type GplxQuestionKey = {
  id: string;
  isCritical: boolean;
  correctAnswerIds: string[];
};

export type GplxAnswerInput = {
  questionId: string;
  selectedAnswerIds: string[];
};

/** Server-authoritative GPLX mock scoring. */
export function scoreGplxExam(
  questions: GplxQuestionKey[],
  answers: GplxAnswerInput[],
  rules: GplxExamRules,
): GplxExamScoreResult {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let correctCount = 0;
  let failedCritical = false;
  const details: GplxScoredQuestion[] = [];

  for (const q of questions) {
    const selected = [...(byId.get(q.id)?.selectedAnswerIds ?? [])].sort();
    const expected = [...q.correctAnswerIds].sort();
    const correct =
      selected.length === expected.length &&
      selected.every((id, i) => id === expected[i]);
    if (correct) correctCount += 1;
    if (!correct && q.isCritical && rules.criticalFailEnabled) {
      failedCritical = true;
    }
    details.push({
      questionId: q.id,
      isCritical: q.isCritical,
      correct,
      selectedAnswerIds: selected,
      correctAnswerIds: expected,
    });
  }

  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const passed =
    !failedCritical && total === rules.questionCount && correctCount >= rules.passCorrectCount;

  return { correctCount, total, score, passed, failedCritical, details };
}

/** Fisher–Yates shuffle (pure; pass rng for tests). */
export function shuffleIds<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a mock exam set: prefer including critical questions, then fill from pool.
 * Returns up to `rules.questionCount` ids (caller must ensure pool is large enough).
 */
export function pickMockQuestionIds(
  pool: Array<{ id: string; isCritical: boolean }>,
  rules: GplxExamRules,
  rng: () => number = Math.random,
): string[] {
  const critical = shuffleIds(
    pool.filter((q) => q.isCritical).map((q) => q.id),
    rng,
  );
  const normal = shuffleIds(
    pool.filter((q) => !q.isCritical).map((q) => q.id),
    rng,
  );

  // Aim ~20% critical when available (official banks mix liệt questions).
  const targetCritical = Math.min(
    critical.length,
    Math.max(1, Math.round(rules.questionCount * 0.2)),
  );
  const picked: string[] = critical.slice(0, targetCritical);
  for (const id of normal) {
    if (picked.length >= rules.questionCount) break;
    picked.push(id);
  }
  // If still short, add remaining critical.
  for (const id of critical.slice(targetCritical)) {
    if (picked.length >= rules.questionCount) break;
    if (!picked.includes(id)) picked.push(id);
  }
  return shuffleIds(picked.slice(0, rules.questionCount), rng);
}

export function gplxProgressStatus(correctCount: number, wrongCount: number): string {
  if (correctCount === 0 && wrongCount === 0) return "unseen";
  if (wrongCount > correctCount) return "wrong";
  if (correctCount >= 2 && wrongCount === 0) return "mastered";
  return "learning";
}

export type GplxMockMode = "random" | "fixed" | "critical_only";

/**
 * Critical-only drill: all critical questions shuffled, capped at rules.questionCount
 * (or all critical if fewer — caller may use custom pass rules).
 */
export function pickCriticalOnlyQuestionIds(
  pool: Array<{ id: string; isCritical: boolean }>,
  rules: GplxExamRules,
  rng: () => number = Math.random,
): string[] {
  const critical = shuffleIds(
    pool.filter((q) => q.isCritical).map((q) => q.id),
    rng,
  );
  if (critical.length === 0) return [];
  // Prefer full critical bank when smaller than exam size; else sample exam-sized set.
  if (critical.length <= rules.questionCount) return critical;
  return critical.slice(0, rules.questionCount);
}

/** Validate fixed-set ids exist in pool and return ordered subset (no shuffle). */
export function resolveFixedSetQuestionIds(
  setQuestionIds: string[],
  poolIds: Set<string>,
): string[] {
  return setQuestionIds.filter((id) => poolIds.has(id));
}

/**
 * Score a mock by mode.
 * - random/fixed (full size): official pass threshold + critical fail
 * - critical_only (partial bank): must answer all correctly
 * - critical_only (full exam size): official threshold (any miss is also critical fail)
 */
export function scoreGplxMockByMode(
  questions: GplxQuestionKey[],
  answers: GplxAnswerInput[],
  rules: GplxExamRules,
  mode: GplxMockMode,
): GplxExamScoreResult {
  const base = scoreGplxExam(questions, answers, {
    ...rules,
    // For critical drills shorter than exam, relax length check in base then override pass.
    questionCount:
      mode === "critical_only" && questions.length !== rules.questionCount
        ? questions.length
        : rules.questionCount,
    passCorrectCount:
      mode === "critical_only" && questions.length !== rules.questionCount
        ? questions.length
        : rules.passCorrectCount,
  });

  if (mode === "critical_only" && questions.length !== rules.questionCount) {
    const passed = base.correctCount === base.total && base.total > 0 && !base.failedCritical;
    return { ...base, passed };
  }
  return base;
}

/** UTC calendar date YYYY-MM-DD. */
export function gplxUtcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export type GplxStreakState = {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
};

/**
 * Apply a study activity on `today` (YYYY-MM-DD UTC). Idempotent same day.
 * Gap > 1 day resets current streak to 1.
 */
export function applyGplxStudyStreak(
  prev: GplxStreakState,
  today: string,
): GplxStreakState {
  if (prev.lastStudyDate === today) {
    return { ...prev };
  }
  if (!prev.lastStudyDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, prev.longestStreak),
      lastStudyDate: today,
    };
  }
  const prevMs = Date.parse(`${prev.lastStudyDate}T00:00:00.000Z`);
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  const dayDiff = Math.round((todayMs - prevMs) / 86_400_000);
  const currentStreak = dayDiff === 1 ? prev.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastStudyDate: today,
  };
}

export type GplxWeakTopicStat = {
  topicId: string;
  topicCode: string;
  topicTitle: string;
  attempted: number;
  wrong: number;
  wrongRate: number;
};

/** Rank topics by personal wrong rate (min 1 attempt). */
export function rankWeakTopics(
  rows: Array<{
    topicId: string;
    topicCode: string;
    topicTitle: string;
    correctCount: number;
    wrongCount: number;
  }>,
): GplxWeakTopicStat[] {
  const byTopic = new Map<
    string,
    { topicId: string; topicCode: string; topicTitle: string; correct: number; wrong: number }
  >();
  for (const r of rows) {
    const cur = byTopic.get(r.topicId) ?? {
      topicId: r.topicId,
      topicCode: r.topicCode,
      topicTitle: r.topicTitle,
      correct: 0,
      wrong: 0,
    };
    cur.correct += r.correctCount;
    cur.wrong += r.wrongCount;
    byTopic.set(r.topicId, cur);
  }
  return [...byTopic.values()]
    .map((t) => {
      const attempted = t.correct + t.wrong;
      return {
        topicId: t.topicId,
        topicCode: t.topicCode,
        topicTitle: t.topicTitle,
        attempted,
        wrong: t.wrong,
        wrongRate: attempted === 0 ? 0 : t.wrong / attempted,
      };
    })
    .filter((t) => t.attempted > 0)
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrong - a.wrong);
}

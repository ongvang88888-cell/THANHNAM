import { describe, expect, it } from "vitest";
import {
  getGplxExamRules,
  scoreGplxExam,
  scoreGplxMockByMode,
  pickMockQuestionIds,
  pickCriticalOnlyQuestionIds,
  gplxProgressStatus,
  applyGplxStudyStreak,
  rankWeakTopics,
} from "./gplx";

describe("getGplxExamRules", () => {
  it("returns B class rules", () => {
    const r = getGplxExamRules("B");
    expect(r.questionCount).toBe(30);
    expect(r.passCorrectCount).toBe(27);
    expect(r.criticalFailEnabled).toBe(true);
  });

  it("returns 2026 B1 rules (25/23, not same as B)", () => {
    const r = getGplxExamRules("B1");
    expect(r.questionCount).toBe(25);
    expect(r.passCorrectCount).toBe(23);
    expect(r.durationSec).toBe(20 * 60);
  });

  it("supports C1", () => {
    const r = getGplxExamRules("C1");
    expect(r.questionCount).toBe(35);
    expect(r.passCorrectCount).toBe(32);
  });

  it("throws on unknown class", () => {
    expect(() => getGplxExamRules("Z9")).toThrow(/Unsupported/);
  });
});

describe("scoreGplxExam", () => {
  const rules = getGplxExamRules("A1");

  it("passes when enough correct and no critical miss", () => {
    const questions = Array.from({ length: 25 }, (_, i) => ({
      id: `q${i}`,
      isCritical: i < 3,
      correctAnswerIds: [`a${i}`],
    }));
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedAnswerIds: q.correctAnswerIds,
    }));
    // Make 4 non-critical wrong → 21 correct
    for (let i = 20; i < 24; i += 1) {
      answers[i] = { questionId: `q${i}`, selectedAnswerIds: ["wrong"] };
    }
    const result = scoreGplxExam(questions, answers, rules);
    expect(result.correctCount).toBe(21);
    expect(result.failedCritical).toBe(false);
    expect(result.passed).toBe(true);
  });

  it("fails when a critical question is wrong", () => {
    const questions = Array.from({ length: 25 }, (_, i) => ({
      id: `q${i}`,
      isCritical: i === 0,
      correctAnswerIds: [`a${i}`],
    }));
    const answers = questions.map((q, i) => ({
      questionId: q.id,
      selectedAnswerIds: i === 0 ? ["x"] : q.correctAnswerIds,
    }));
    const result = scoreGplxExam(questions, answers, rules);
    expect(result.correctCount).toBe(24);
    expect(result.failedCritical).toBe(true);
    expect(result.passed).toBe(false);
  });
});

describe("pickMockQuestionIds", () => {
  it("returns exact count and includes exactly one critical when available", () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, isCritical: true })),
      ...Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, isCritical: false })),
    ];
    let n = 0;
    const rng = () => {
      n += 0.01;
      return n % 1;
    };
    const ids = pickMockQuestionIds(pool, getGplxExamRules("A1"), rng);
    expect(ids).toHaveLength(25);
    const criticalPicked = ids.filter((id) => id.startsWith("c"));
    expect(criticalPicked).toHaveLength(1);
  });
});

describe("gplxProgressStatus", () => {
  it("maps counts to status labels", () => {
    expect(gplxProgressStatus(0, 0)).toBe("unseen");
    expect(gplxProgressStatus(0, 2)).toBe("wrong");
    expect(gplxProgressStatus(2, 0)).toBe("mastered");
    expect(gplxProgressStatus(1, 1)).toBe("learning");
  });
});

describe("applyGplxStudyStreak", () => {
  it("starts and continues consecutive days", () => {
    const d1 = applyGplxStudyStreak(
      { currentStreak: 0, longestStreak: 0, lastStudyDate: "" },
      "2026-08-01",
    );
    expect(d1.currentStreak).toBe(1);
    const d2 = applyGplxStudyStreak(d1, "2026-08-02");
    expect(d2.currentStreak).toBe(2);
    expect(d2.longestStreak).toBe(2);
  });

  it("is idempotent same day and resets after gap", () => {
    const base = { currentStreak: 5, longestStreak: 5, lastStudyDate: "2026-08-01" };
    expect(applyGplxStudyStreak(base, "2026-08-01").currentStreak).toBe(5);
    expect(applyGplxStudyStreak(base, "2026-08-03").currentStreak).toBe(1);
  });
});

describe("pickCriticalOnlyQuestionIds", () => {
  it("returns all critical when fewer than exam size", () => {
    const pool = [
      { id: "c1", isCritical: true },
      { id: "c2", isCritical: true },
      { id: "n1", isCritical: false },
    ];
    const ids = pickCriticalOnlyQuestionIds(pool, getGplxExamRules("B"), () => 0.5);
    expect(ids).toHaveLength(2);
  });
});

describe("scoreGplxMockByMode", () => {
  it("requires all correct for short critical drill", () => {
    const questions = [
      { id: "c1", isCritical: true, correctAnswerIds: ["a1"] },
      { id: "c2", isCritical: true, correctAnswerIds: ["a2"] },
    ];
    const ok = scoreGplxMockByMode(
      questions,
      [
        { questionId: "c1", selectedAnswerIds: ["a1"] },
        { questionId: "c2", selectedAnswerIds: ["a2"] },
      ],
      getGplxExamRules("B"),
      "critical_only",
    );
    expect(ok.passed).toBe(true);
    const bad = scoreGplxMockByMode(
      questions,
      [
        { questionId: "c1", selectedAnswerIds: ["a1"] },
        { questionId: "c2", selectedAnswerIds: ["x"] },
      ],
      getGplxExamRules("B"),
      "critical_only",
    );
    expect(bad.passed).toBe(false);
    expect(bad.failedCritical).toBe(true);
  });
});

describe("rankWeakTopics", () => {
  it("sorts by wrong rate", () => {
    const ranked = rankWeakTopics([
      {
        topicId: "t1",
        topicCode: "a",
        topicTitle: "A",
        correctCount: 8,
        wrongCount: 2,
      },
      {
        topicId: "t2",
        topicCode: "b",
        topicTitle: "B",
        correctCount: 1,
        wrongCount: 4,
      },
    ]);
    expect(ranked[0]?.topicId).toBe("t2");
  });
});

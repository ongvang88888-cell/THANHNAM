import { describe, expect, it } from "vitest";
import {
  getGplxExamRules,
  scoreGplxExam,
  pickMockQuestionIds,
  gplxProgressStatus,
} from "./gplx";

describe("getGplxExamRules", () => {
  it("returns B class rules", () => {
    const r = getGplxExamRules("B");
    expect(r.questionCount).toBe(30);
    expect(r.passCorrectCount).toBe(27);
    expect(r.criticalFailEnabled).toBe(true);
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
  it("returns exact count and includes critical when available", () => {
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
    expect(ids.some((id) => id.startsWith("c"))).toBe(true);
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

import { describe, expect, it } from "vitest";
import { scoreQuizAttempt, passedQuiz } from "./quiz";

describe("scoreQuizAttempt", () => {
  it("scores MCQ correctly", () => {
    const result = scoreQuizAttempt(
      [
        { id: "q1", type: "mcq", correctAnswerIds: ["a1"] },
        { id: "q2", type: "true_false", correctAnswerIds: ["b1"] },
      ],
      [
        { questionId: "q1", selectedAnswerIds: ["a1"] },
        { questionId: "q2", selectedAnswerIds: ["b2"] },
      ],
    );
    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(50);
    expect(passedQuiz(result.score, 70)).toBe(false);
  });

  it("requires exact multi-select match", () => {
    const result = scoreQuizAttempt(
      [{ id: "q1", type: "multi", correctAnswerIds: ["a1", "a2"] }],
      [{ questionId: "q1", selectedAnswerIds: ["a2", "a1"] }],
    );
    expect(result.score).toBe(100);
  });
});

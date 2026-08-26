"use client";

import {
  PIPELINE_STEPS,
  RECIPE_CHECKLIST,
  RECIPE_STATUS_LABEL,
  pipelineIndex,
  type RecipeRow,
} from "@/lib/lecture-recipe";

export function LectureRecipeProgress(props: {
  currentStep?: string;
  progress?: number;
  stepLabel?: string;
  techniques?: RecipeRow[] | null;
  compact?: boolean;
  hideApply?: boolean;
}) {
  const steps = props.hideApply ? PIPELINE_STEPS.filter((step) => step.id !== "apply") : PIPELINE_STEPS;
  const currentIndex = pipelineIndex(props.currentStep);
  const shiftedIndex = props.hideApply && currentIndex > pipelineIndex("apply")
    ? currentIndex - 1
    : Math.min(currentIndex, steps.length - 1);
  const progress = Math.max(0, Math.min(100, Math.round(props.progress ?? 0)));
  const rows = props.techniques && props.techniques.length > 0 ? props.techniques : RECIPE_CHECKLIST;

  return (
    <div className={`auto-publish-progress${props.compact ? " is-compact" : ""}`}>
      <div className="auto-publish-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="auto-publish-step">
        {progress}% — {props.stepLabel || steps[shiftedIndex]?.label}
      </p>
      <ol className="auto-publish-steps">
        {steps.map((step, index) => {
          const state = index < shiftedIndex ? "is-done" : index === shiftedIndex ? "is-current" : "";
          return (
            <li key={step.id} className={state}>
              {index < shiftedIndex ? "✓" : index === shiftedIndex ? "→" : "·"} {step.label}
            </li>
          );
        })}
      </ol>
      <RecipeChecklist rows={rows} compact={props.compact} />
    </div>
  );
}

export function RecipeChecklist(props: { rows?: RecipeRow[] | null; compact?: boolean }) {
  const rows = props.rows && props.rows.length > 0 ? props.rows : RECIPE_CHECKLIST;
  const body = (
    <ul>
      {rows.map((row) => (
        <li key={row.id} className={`is-${row.status}`}>
          <span className="auto-publish-recipe-status">{RECIPE_STATUS_LABEL[row.status]}</span>
          <span>{row.label}</span>
          {row.note && !props.compact ? <small>{row.note}</small> : null}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`auto-publish-recipe${props.compact ? " is-compact" : ""}`}>
      {props.compact ? (
        <details>
          <summary>Công thức chuyên gia v1 — cùng phân tích như tải 1 video</summary>
          {body}
        </details>
      ) : (
        <>
          <h4>Công thức chuyên gia v1</h4>
          {body}
        </>
      )}
    </div>
  );
}

export const INSERT_MODES = ["overlay", "intro", "replace"] as const;
export const CHARACTER_LOOKS = ["teacher", "cartoon_kid", "custom"] as const;
export const INSERT_PIP_REGIONS = ["pip_br", "pip_bl", "pip_tr", "pip_tl"] as const;

export type InsertMode = (typeof INSERT_MODES)[number];
export type CharacterLook = (typeof CHARACTER_LOOKS)[number];
export type InsertPipRegion = (typeof INSERT_PIP_REGIONS)[number];

export function isInsertMode(value: string): value is InsertMode {
  return (INSERT_MODES as readonly string[]).includes(value);
}

export function isCharacterLook(value: string): value is CharacterLook {
  return (CHARACTER_LOOKS as readonly string[]).includes(value);
}

export function isPipInsertRegion(region: string | undefined): region is InsertPipRegion {
  return (INSERT_PIP_REGIONS as readonly string[]).includes(region ?? "");
}

export function overlayRegionForInsert(region: string | undefined): InsertPipRegion {
  return isPipInsertRegion(region) ? region : "pip_br";
}

export function defaultInsertMode(toolId: string): InsertMode {
  if (toolId === "veo_intro") return "intro";
  if (toolId === "avatar_presenter" || toolId === "hailuo_character") return "overlay";
  return "replace";
}

export function characterStillPrompt(look: CharacterLook, title: string, extra?: string): string {
  const lesson = title.trim().slice(0, 80) || "classroom lesson";
  const more = extra?.trim().slice(0, 180);
  if (look === "cartoon_kid") {
    return [
      "Cute Pixar-like 3D cartoon child in a bright classroom, facing camera, friendly smile, soft lighting, 16:9, no text, no logos.",
      `Lesson mood: ${lesson}.`,
      more,
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (look === "teacher") {
    return [
      "Photoreal Vietnamese female teacher, red ao dai, standing at a school gate, looking at camera, natural daylight, 16:9, no text, no logos.",
      `Lesson mood: ${lesson}.`,
      more,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return more || `Educational presenter portrait for: ${lesson}. Facing camera, 16:9, no text, no logos.`;
}

export function hailuoMotionPrompt(look: CharacterLook, script?: string): string {
  const spoken = script?.replace(/\s+/g, " ").trim().slice(0, 240);
  const motion =
    look === "cartoon_kid"
      ? "The cartoon child talks to the camera, gentle head motion, classroom background stays stable."
      : look === "teacher"
        ? "The teacher talks to the camera, natural blinks and slight head motion, school background stays stable."
        : "The character talks to the camera with natural motion. Background stays stable.";
  return spoken ? `${motion} Spoken line: "${spoken}"` : motion;
}

export function veoIntroPrompt(look: CharacterLook, title: string, script?: string): string {
  const lesson = title.trim().slice(0, 80) || "an online class";
  const spoken = script?.replace(/\s+/g, " ").trim().slice(0, 180);
  const who =
    look === "cartoon_kid"
      ? "a cute consistent Pixar-like 3D cartoon child"
      : look === "teacher"
        ? "a consistent photoreal Vietnamese teacher in a red ao dai"
        : "a consistent educational presenter";
  const line = spoken ? ` The presenter says: "${spoken}".` : " The presenter greets students in Vietnamese.";
  return `Cinematic 8-second 16:9 classroom intro. ${who} looks at camera and welcomes students to ${lesson}.${line} Educational, warm lighting, no logos, no on-screen text.`;
}

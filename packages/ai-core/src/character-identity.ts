import { isCharacterLook, hailuoMotionPrompt, type CharacterLook } from "./character";
import { parsePublicHttpsUrl } from "./remote-media";

export const PRESENTER_ID_MAX = 80;
export const CHARACTER_BIBLE_MAX = 2000;
export const CHARACTER_NAME_MAX = 60;

export type PresenterIdentity = {
  autoReplace: boolean;
  confirmOwned: boolean;
  confirmLikeness: boolean;
  stillUrl?: string | null;
  heygenAvatarId?: string | null;
  heygenTalkingPhotoId?: string | null;
};

export type PresenterCharacterInput = {
  name: string;
  look: CharacterLook;
  bible: string;
  stillUrl?: string;
  autoReplace: boolean;
  confirmOwned: boolean;
  confirmLikeness: boolean;
};

export type PresenterCharacterView = {
  name: string;
  look: CharacterLook;
  bible: string;
  stillUrl: string | null;
  autoReplace: boolean;
  confirmOwned: boolean;
  confirmLikeness: boolean;
  hasHeygenAvatar: boolean;
  hasHeygenTalkingPhoto: boolean;
  ready: boolean;
  gap: string;
};

export function defaultCharacterBible(look: CharacterLook, name: string): string {
  const who = name.trim().slice(0, CHARACTER_NAME_MAX) || "the presenter";
  if (look === "cartoon_kid") {
    return [
      `Same Pixar-like 3D child named ${who} in every shot.`,
      "Round face, large bright eyes, soft cheeks, short neat hair, friendly closed-mouth smile.",
      "Simple classroom clothes, warm key light, 16:9, eye-level, facing camera.",
      "Do not change age, face, hair, or outfit. No text, no logos, no extra people.",
    ].join(" ");
  }
  if (look === "teacher") {
    return [
      `Same photoreal Vietnamese female teacher named ${who} in every shot.`,
      "Adult, oval face, natural makeup, dark hair tied back, warm brown eyes, calm smile.",
      "Red ao dai, standing in a bright school hallway, daylight, 16:9, eye-level, facing camera.",
      "Lock identity: same face, hair, skin, clothes, and age. No text, no logos, no extra people.",
    ].join(" ");
  }
  return [
    `Same educational presenter named ${who} in every shot.`,
    "Photoreal, adult, facing camera, 16:9, even classroom lighting.",
    "Keep the exact face, hair, clothes, and age. No text, no logos, no extra people.",
  ].join(" ");
}

export function lockedHailuoMotionPrompt(look: CharacterLook, bible: string, script?: string): string {
  const lock = bible.replace(/\s+/g, " ").trim().slice(0, 500);
  const motion = hailuoMotionPrompt(look, script);
  return `Keep the EXACT same person as the first frame. Do not change face, hair, age, or clothes. ${lock} ${motion}`.trim();
}

export function presenterGreeting(name: string, look: CharacterLook): string {
  const who = name.trim().slice(0, 40) || (look === "cartoon_kid" ? "bạn nhỏ" : "cô giáo");
  return `Xin chào các em. ${who} sẽ hướng dẫn bài học hôm nay.`;
}

export function isReusablePresenterId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{4,80}$/.test(value.trim());
}

export function asCharacterLook(value: string | null | undefined): CharacterLook {
  return value && isCharacterLook(value) ? value : "teacher";
}

export function characterReadyForAutoReplace(profile: PresenterIdentity): boolean {
  if (!profile.autoReplace || !profile.confirmOwned || !profile.confirmLikeness) return false;
  if (profile.heygenAvatarId || profile.heygenTalkingPhotoId) return true;
  return Boolean(profile.stillUrl && profile.stillUrl.startsWith("https://"));
}

export function describeCharacterGap(profile: PresenterIdentity, caps: { heygen: boolean; minimax: boolean }): string {
  if (!profile.confirmOwned || !profile.confirmLikeness) {
    return "Cần xác nhận bạn sở hữu ảnh/kịch bản và đây là người ảo hoặc ảnh bạn có quyền.";
  }
  if (!profile.autoReplace) {
    return "Tự thay người đang tắt — bật để mọi video dùng cùng nhân vật.";
  }
  if (!caps.heygen && !caps.minimax) {
    return "Cần HEYGEN_API_KEY (avatar tái dùng, học từ HeyGen Instant Avatar / v3) hoặc MINIMAX_API_KEY (cùng một ảnh Hailuo).";
  }
  if (!characterReadyForAutoReplace(profile)) {
    return "Cần ảnh https công khai hoặc mô tả chi tiết để tạo avatar một lần, rồi tái dùng cho mọi bài.";
  }
  return "Nhân vật đủ để tự che người khi tải video.";
}

export function parsePresenterCharacterInput(input: unknown): PresenterCharacterInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Hồ sơ nhân vật phải là object");
  }
  const rec = input as Record<string, unknown>;
  if (typeof rec.name !== "string") {
    throw new Error("Tên nhân vật phải là chuỗi");
  }
  const name = rec.name.trim().slice(0, CHARACTER_NAME_MAX);
  if (name.length < 2) {
    throw new Error("Tên nhân vật tối thiểu 2 ký tự");
  }
  if (typeof rec.look !== "string" || !isCharacterLook(rec.look)) {
    throw new Error("Kiểu nhân vật phải là teacher, cartoon_kid hoặc custom");
  }
  let bible = "";
  if (rec.bible !== undefined) {
    if (typeof rec.bible !== "string" || rec.bible.length > CHARACTER_BIBLE_MAX) {
      throw new Error(`Mô tả nhân vật tối đa ${CHARACTER_BIBLE_MAX} ký tự`);
    }
    bible = rec.bible.replace(/\s+/g, " ").trim();
  }
  if (!bible) bible = defaultCharacterBible(rec.look, name);
  let stillUrl: string | undefined;
  if (rec.stillUrl !== undefined && rec.stillUrl !== null && rec.stillUrl !== "") {
    if (typeof rec.stillUrl !== "string" || rec.stillUrl.length > 500) {
      throw new Error("Ảnh nhân vật tối đa 500 ký tự");
    }
    const trimmed = rec.stillUrl.trim();
    parsePublicHttpsUrl(trimmed, "Ảnh nhân vật");
    stillUrl = trimmed;
  }
  if (typeof rec.confirmOwned !== "boolean") {
    throw new Error("confirmOwned phải là true hoặc false");
  }
  if (typeof rec.confirmLikeness !== "boolean") {
    throw new Error("confirmLikeness phải là true hoặc false");
  }
  const autoReplace = rec.autoReplace === undefined ? true : rec.autoReplace;
  if (typeof autoReplace !== "boolean") {
    throw new Error("autoReplace phải là true hoặc false");
  }
  return {
    name,
    look: rec.look,
    bible,
    stillUrl,
    autoReplace,
    confirmOwned: rec.confirmOwned,
    confirmLikeness: rec.confirmLikeness,
  };
}

export function presentPresenterCharacter(
  row: {
    name: string;
    look: string;
    bible: string;
    stillUrl?: string | null;
    autoReplace: boolean;
    confirmOwned: boolean;
    confirmLikeness: boolean;
    heygenAvatarId?: string | null;
    heygenTalkingPhotoId?: string | null;
  },
  caps: { heygen: boolean; minimax: boolean },
): PresenterCharacterView {
  const look = asCharacterLook(row.look);
  const identity: PresenterIdentity = {
    autoReplace: row.autoReplace,
    confirmOwned: row.confirmOwned,
    confirmLikeness: row.confirmLikeness,
    stillUrl: row.stillUrl,
    heygenAvatarId: row.heygenAvatarId,
    heygenTalkingPhotoId: row.heygenTalkingPhotoId,
  };
  return {
    name: row.name,
    look,
    bible: row.bible,
    stillUrl: row.stillUrl ?? null,
    autoReplace: row.autoReplace,
    confirmOwned: row.confirmOwned,
    confirmLikeness: row.confirmLikeness,
    hasHeygenAvatar: Boolean(row.heygenAvatarId),
    hasHeygenTalkingPhoto: Boolean(row.heygenTalkingPhotoId),
    ready: characterReadyForAutoReplace(identity) && (caps.heygen || caps.minimax),
    gap: describeCharacterGap(identity, caps),
  };
}

export function emptyPresenterCharacter(caps: { heygen: boolean; minimax: boolean }): PresenterCharacterView {
  return presentPresenterCharacter(
    {
      name: "Cô Minh",
      look: "teacher",
      bible: defaultCharacterBible("teacher", "Cô Minh"),
      stillUrl: null,
      autoReplace: true,
      confirmOwned: false,
      confirmLikeness: false,
    },
    caps,
  );
}

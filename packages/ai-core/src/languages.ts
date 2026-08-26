export const TARGET_LANGUAGE_IDS = ["vi", "en", "zh", "ja", "ko", "fr", "de", "es", "th", "id"] as const;

export type TargetLanguageId = (typeof TARGET_LANGUAGE_IDS)[number];

export interface TargetLanguageDef {
  id: TargetLanguageId;
  label: string;
  heygenName: string;
}

export const TARGET_LANGUAGES: readonly TargetLanguageDef[] = [
  { id: "vi", label: "Tiếng Việt", heygenName: "Vietnamese" },
  { id: "en", label: "English", heygenName: "English" },
  { id: "zh", label: "中文", heygenName: "Chinese" },
  { id: "ja", label: "日本語", heygenName: "Japanese" },
  { id: "ko", label: "한국어", heygenName: "Korean" },
  { id: "fr", label: "Français", heygenName: "French" },
  { id: "de", label: "Deutsch", heygenName: "German" },
  { id: "es", label: "Español", heygenName: "Spanish" },
  { id: "th", label: "ไทย", heygenName: "Thai" },
  { id: "id", label: "Bahasa Indonesia", heygenName: "Indonesian" },
];

export function isTargetLanguageId(value: string): value is TargetLanguageId {
  return (TARGET_LANGUAGE_IDS as readonly string[]).includes(value);
}

export function getTargetLanguage(id: string): TargetLanguageDef | null {
  return TARGET_LANGUAGES.find((row) => row.id === id) ?? null;
}

export function openaiVoiceForLanguage(id: string): "alloy" | "nova" | "onyx" | "shimmer" {
  switch (id) {
    case "vi":
    case "th":
    case "id":
      return "nova";
    case "ja":
    case "ko":
    case "zh":
      return "shimmer";
    case "de":
    case "fr":
      return "onyx";
    default:
      return "alloy";
  }
}

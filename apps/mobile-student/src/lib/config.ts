type ExtraConfig = {
  apiUrl?: string;
  appId?: string;
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function extraFromConstants(): ExtraConfig {
  try {
    // Transitive Expo SDK dependency — present in Expo Go and EAS.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants") as {
      expoConfig?: { extra?: ExtraConfig };
      manifest?: { extra?: ExtraConfig };
    };
    return Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
  } catch {
    return {};
  }
}

export function resolveApiUrl(): string {
  const extra = extraFromConstants();
  const raw =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    extra.apiUrl?.trim() ||
    "http://127.0.0.1:3001/api/v1";
  return stripTrailingSlash(raw);
}

export function resolveAppId(): string {
  const extra = extraFromConstants();
  return process.env.EXPO_PUBLIC_APP_ID?.trim() || extra.appId?.trim() || "education_app";
}

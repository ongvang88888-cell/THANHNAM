/**
 * Dynamic Expo config. Static defaults live in app.json.
 * Production EAS builds refuse localhost / non-https API URLs so a store
 * binary cannot ship pointed at 127.0.0.1.
 */

function stripTrailingSlash(url) {
  return String(url || "").replace(/\/$/, "");
}

function isLoopbackHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "10.0.2.2" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]"
  );
}

function assertProductionApiUrl(apiUrl) {
  if (!apiUrl) {
    throw new Error(
      "Production EAS build requires EXPO_PUBLIC_API_URL (public https API, including /api/v1).",
    );
  }
  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_URL is not a valid URL: ${apiUrl}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      `Production EAS build requires https EXPO_PUBLIC_API_URL, got ${parsed.protocol}//${parsed.hostname}`,
    );
  }
  if (isLoopbackHost(parsed.hostname)) {
    throw new Error(
      "Production EAS build refuses a loopback EXPO_PUBLIC_API_URL. Store users cannot reach your laptop.",
    );
  }
}

module.exports = ({ config }) => {
  const extra = { ...(config.extra || {}) };
  const apiUrl = stripTrailingSlash(
    process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || "http://127.0.0.1:3001/api/v1",
  );
  const appId = process.env.EXPO_PUBLIC_APP_ID || extra.appId || "education_app";

  extra.apiUrl = apiUrl;
  extra.appId = appId;

  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile === "production") {
    assertProductionApiUrl(apiUrl);
  }

  return {
    ...config,
    extra,
  };
};

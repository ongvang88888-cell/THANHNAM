import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  PLATFORM_SECRET_KEYS,
  applyPlatformSecretsPatch,
  resolvePlatformSecrets,
  type PlatformSecrets,
} from "../domain/platform-secrets";

const FILE_NAME = "platform-secrets.json";

export function platformSecretsPath(): string {
  return path.resolve(process.cwd(), "data", FILE_NAME);
}

export function readPlatformSecretsOverlay(): PlatformSecrets {
  try {
    const raw = readFileSync(platformSecretsPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: PlatformSecrets = {};
    const record = parsed as Record<string, unknown>;
    for (const key of PLATFORM_SECRET_KEYS) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        out[key] = value.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writePlatformSecretsOverlay(next: PlatformSecrets): void {
  const dir = path.dirname(platformSecretsPath());
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dir, 0o700);
  } catch {
    /* directory may already exist with looser umask */
  }
  const body: PlatformSecrets = {};
  for (const key of PLATFORM_SECRET_KEYS) {
    const value = next[key]?.trim();
    if (value) {
      body[key] = value;
    }
  }
  const file = platformSecretsPath();
  writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
}

export function savePlatformSecretsPatch(payload: unknown): PlatformSecrets {
  const merged = applyPlatformSecretsPatch(readPlatformSecretsOverlay(), payload);
  writePlatformSecretsOverlay(merged);
  return merged;
}

export function resolvedPlatformSecrets(): PlatformSecrets {
  return resolvePlatformSecrets(process.env, readPlatformSecretsOverlay());
}

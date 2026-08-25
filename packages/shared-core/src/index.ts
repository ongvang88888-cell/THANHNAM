export type RoleCode =
  | "guest"
  | "student"
  | "teacher"
  | "teacher_assistant"
  | "affiliate"
  | "support_agent"
  | "admin"
  | "super_admin";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}

export type RemoteConfigKeys =
  | "ads_enabled"
  | "rewarded_enabled"
  | "reward_limit"
  | "reward_duration"
  | "interstitial_frequency"
  | "premium_enabled"
  | "purchase_enabled"
  | "subscription_enabled"
  | "maintenance_mode"
  | "minimum_version"
  | "recommended_version";

export interface AuthUserContext {
  userId: string;
  appId: string;
  email: string;
  roles: RoleCode[];
  sessionId: string;
}

export function hasRole(user: { roles: RoleCode[] }, role: RoleCode): boolean {
  return user.roles.includes(role) || user.roles.includes("super_admin");
}

export function hasAnyRole(user: { roles: RoleCode[] }, roles: RoleCode[]): boolean {
  return roles.some((r) => hasRole(user, r));
}

export * from "./errors";
export * from "./result";

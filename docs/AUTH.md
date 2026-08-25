# Authentication & Authorization

## Goals

- Secure multi-client auth (web + mobile)
- Refresh token rotation
- RBAC with resource scoping
- No secrets in clients beyond public keys

## AuthN flow

1. Register/login → create `session` + device binding
2. Issue **access JWT** (short TTL, e.g. 15m) + **refresh token** (opaque, stored hashed)
3. Refresh: rotate refresh token; revoke old; detect reuse → revoke family
4. Logout: revoke session

## Password

- Argon2id (or bcrypt cost ≥ 12 if Argon2 unavailable)
- Breach checks optional later
- Lockout / rate limit on login

## JWT claims (minimal)

```json
{
  "sub": "userId",
  "app_id": "...",
  "sid": "sessionId",
  "roles": ["student"],
  "ver": 1
}
```

Do **not** put `isPremium` or entitlement lists in JWT as authority.

## AuthZ

- Permission checks in API guards + domain services
- Ownership checks for teacher resources
- Admin actions audited

## OAuth / social / SSO

Interface reserved (`IdentityProviderPort`). MVP email/password; Google/Apple Sign-In adapters Should-Have.

## Mobile secure storage

- iOS Keychain / Android Keystore via Expo SecureStore
- Never store access tokens in AsyncStorage plain

## CSRF

- Bearer token APIs: low CSRF risk
- Cookie session mode (if used for web): SameSite + CSRF token

## Session / device limits

Configurable max sessions per user; kick oldest or require reauth. Used also for concurrent playback policy hooks.

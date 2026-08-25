# Security Architecture

## Mandatory controls

HTTPS · Argon2id passwords · JWT + refresh rotation · secure token storage · input validation · RBAC · rate limiting · CORS allowlists · CSRF when cookie auth · file validation · upload limits · MIME checks · signed URLs · audit logs · secrets manager · encryption at rest (disk/KMS)

## Forbidden

- Secrets in source / client bundles
- Logging passwords, tokens, payment credentials, unnecessary PII
- Trusting client for entitlements/rewards
- Public buckets for paid media
- SQL/NoSQL injection via string concat
- Overly permissive CORS `*`

## Threat model (abridged)

| Threat | Mitigation |
|--------|------------|
| Stolen access token | Short TTL + refresh rotation + session revoke |
| Reward spoofing | AdMob SSV ECDSA + replay store |
| Media hotlink/share | Short signed URLs + concurrent limits + watermark |
| Payment replay | Idempotency keys + provider event uniqueness |
| Teacher data leak | Scoped queries + tests |
| Upload malware | MIME + size + AV scan hook |
| Admin abuse | Audit + least privilege |

## Content protection (reduce, not absolute)

Signed URLs · access tokens · session limits · playback concurrency · watermark abstraction · download controls · suspicious access detection · rate limits · audit

Watermark may show protected user identifier / time / order ref — never raw secrets.

## Privacy

Minimize analytics PII; retention policies; export/delete user data workflows (implement in hardening phase).

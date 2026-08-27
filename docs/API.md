# API Architecture

## Style

- HTTPS JSON REST for MVP (versioned)
- Optional tRPC/GraphQL later for BFF — **not** required for Core
- OpenAPI 3.1 generated from NestJS decorators
- Idempotency-Key header required on create payment/order/reward grant paths

## Versioning

```
/api/v1/...
```

Breaking changes → `/api/v2`. Deprecation window documented.

## Cross-cutting headers

| Header | Purpose |
|--------|---------|
| `Authorization: Bearer <access>` | Auth |
| `X-App-Id` | Multi-app scope (or derived from API key / host) |
| `Idempotency-Key` | Mutations that grant money/rights |
| `X-Request-Id` | Tracing |
| `X-Device-Id` | Session/device limits |

## Resource groups (v1)

### Identity
`POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /me`

### Catalog
`GET /products` · `GET /products/:slug` · `GET /categories` · `GET /search`

### Curriculum
`GET /courses/:id` · `GET /courses/:id/curriculum` · `GET /lessons/:id` · `POST /lessons/:id/access` (evaluate)

### Media
`POST /videos/upload-sessions` · `GET /videos/:id/playback` · `GET /documents/:id/content`

### Commerce
`POST /checkout/sessions` · `GET /orders` · `GET /orders/:id` · `POST /payments/webhooks/:provider`

### Entitlements
`GET /entitlements/me` · (admin grant endpoints)

### Rewards
`POST /rewards/eligibility` · `POST /rewards/ssv/:provider` (server-to-server)

### Learning
`GET /me/continue` · `PUT /lessons/:id/progress` · `GET /me/library`

### GPLX (driver license theory)
`GET /gplx/overview` · `GET /gplx/topics` · `POST /gplx/practice/answer` · `POST /gplx/mock/start` · `POST /gplx/mock/:id/submit` — see [GPLX.md](./GPLX.md)

### Teacher / Admin
Namespaced under `/teacher/*` and `/admin/*` with RBAC.

## Error envelope

```json
{
  "error": {
    "code": "NEEDS_PURCHASE",
    "message": "Purchase required",
    "details": { "productIds": ["..."] },
    "requestId": "..."
  }
}
```

Map domain access codes to HTTP:

| Decision | HTTP |
|----------|------|
| CAN_ACCESS | 200 |
| NEEDS_PURCHASE / NEEDS_AD | 402 or 403 with code |
| NEEDS_PREREQUISITE | 403 |
| UNAUTHENTICATED | 401 |
| FORBIDDEN | 403 |
| CONFLICT / IDEMPOTENT replay | 200 with original resource |

## Pagination

```json
{ "items": [], "nextCursor": "...", "hasMore": true }
```

## Rate limiting

Per IP + per user + per app; stricter on auth, SSV, checkout.

## Webhooks

Provider endpoints verify signatures, enqueue processing, return 200 quickly.

# Database Design

## Principles

- PostgreSQL as system of record
- 3NF-ish document-relational: flat tables + FKs (not deep JSON trees for core relations)
- Every multi-app row includes `app_id` where tenant-scoped
- Migrations required (Prisma Migrate or equivalent)
- Indexes for all FK lookups and hot access paths
- No secrets in DB logs; tokenize PII where feasible

## ERD (logical)

```
apps ─┬─ users ─┬─ user_roles ─ roles ─ role_permissions ─ permissions
      │         ├─ sessions / devices
      │         ├─ orders ─ order_items ─ products
      │         ├─ entitlements
      │         ├─ subscriptions
      │         ├─ lesson_progress / course_progress
      │         └─ reward_transactions
      │
      ├─ products ─┬─ product_prices
      │            ├─ product_tags ─ tags
      │            └─ categories (m2m)
      │
      ├─ courses ─ sections ─ lessons ─ lesson_contents
      │                └─ access_policies
      ├─ videos / video_assets / video_processing_jobs
      ├─ documents / document_versions
      ├─ bundles / bundle_items
      ├─ coupons / promotions / coupon_redemptions
      ├─ payments / transactions / refunds
      ├─ quizzes / questions / answers / quiz_attempts
      ├─ gplx_topics / gplx_bank_questions / gplx_bank_answers / gplx_study_progress / gplx_mock_attempts
      ├─ certificates
      ├─ reviews
      ├─ affiliates / referrals / commissions
      ├─ notifications / notification_preferences
      ├─ analytics_events
      └─ app_configs / feature_flags / audit_logs
```

## Schema proposal (core tables)

### Identity

```sql
apps(id, slug, name, branding_json, enabled_modules_json, monetization_config_json, status, created_at, updated_at)
users(id, app_id, email, password_hash, status, display_name, locale, created_at, updated_at)
roles(id, app_id nullable, code, name)
permissions(id, code, description)
role_permissions(role_id, permission_id)
user_roles(user_id, role_id, scope_type, scope_id, created_at)
sessions(id, user_id, refresh_token_hash, device_id, expires_at, revoked_at, created_at)
devices(id, user_id, platform, push_token, fingerprint_hash, last_seen_at)
```

Indexes: `users(app_id, email)` UNIQUE; `sessions(user_id, expires_at)`.

### Catalog

```sql
products(id, app_id, type, name, slug, description, thumbnail_asset_id, status, visibility, creator_user_id, category_id, metadata_json, created_at, updated_at)
product_prices(id, product_id, currency, amount_minor, compare_at_minor, valid_from, valid_to)
categories(id, app_id, parent_id, name, slug, path)
tags(id, app_id, name, slug)
product_tags(product_id, tag_id)
```

Indexes: `products(app_id, slug)` UNIQUE; `products(app_id, type, status)`.

### Curriculum

```sql
courses(id, app_id, product_id, title, level, language, status, ...)
course_sections(id, course_id, title, position, ...)
lessons(id, section_id, title, position, duration_sec, is_preview, completion_rule_json, ...)
lesson_contents(id, lesson_id, content_type, ref_id, position, metadata_json)
access_policies(id, resource_type, resource_id, policy_type, params_json, priority)
```

### Media

```sql
videos(id, app_id, owner_user_id, title, status, duration_ms, ...)
video_assets(id, video_id, quality, format, storage_key, size_bytes, checksum)
video_processing_jobs(id, video_id, provider, status, attempts, error, created_at, updated_at)
documents(id, app_id, owner_user_id, title, status, ...)
document_versions(id, document_id, version, storage_key, mime, size_bytes, checksum, created_at)
```

### Commerce & rights

```sql
orders(id, app_id, user_id, status, currency, total_minor, idempotency_key, created_at)
order_items(id, order_id, product_id, quantity, unit_amount_minor, metadata_json)
payments(id, order_id, provider, provider_ref, status, amount_minor, raw_normalized_json, created_at)
transactions(id, payment_id, type, amount_minor, provider_event_id UNIQUE, created_at)
refunds(id, payment_id, amount_minor, reason, status, created_at)
entitlements(id, app_id, user_id, resource_type, resource_id, source, source_ref, status, granted_at, expires_at, metadata_json)
-- UNIQUE(user_id, resource_type, resource_id, source, source_ref) WHERE status active
subscriptions(id, app_id, user_id, plan_product_id, status, current_period_start, current_period_end, cancel_at)
subscription_events(id, subscription_id, type, provider_event_id UNIQUE, payload_json, created_at)
bundles(id, product_id, ...)
bundle_items(bundle_id, product_id, position)
reward_transactions(id, app_id, user_id, provider, provider_tx_id UNIQUE, policy_id, resource_type, resource_id, status, verified_at, grant_entitlement_id)
```

### Learning & assessment

```sql
course_progress(id, user_id, course_id, percent_basis_points, last_lesson_id, completed_at, updated_at)
lesson_progress(id, user_id, lesson_id, status, video_position_ms, time_spent_ms, completed_at, updated_at)
bookmarks(id, user_id, resource_type, resource_id, created_at)
notes(id, user_id, resource_type, resource_id, body, anchor_json, created_at, updated_at)
learning_sessions(id, user_id, started_at, ended_at, device_id)
quizzes(id, course_id, title, config_json)
questions(id, quiz_id, type, stem, metadata_json, position)
answers(id, question_id, body, is_correct, position)
quiz_attempts(id, quiz_id, user_id, score, started_at, submitted_at, detail_json)
certificates(id, public_id UNIQUE, user_id, course_id, issued_at, revoke_at, metadata_json)
```

## Indexing strategy (hot paths)

- Entitlement check: `(app_id, user_id, resource_type, resource_id, status, expires_at)`
- Continue learning: `(user_id, updated_at DESC)` on lesson_progress
- Catalog browse: `(app_id, status, visibility)` + slug
- Orders by user: `(app_id, user_id, created_at DESC)`
- Provider webhook: unique `provider_event_id`

## Pagination

Cursor-based on `(created_at, id)` for feeds; never unbounded `SELECT *`.

## Migration & rollback

- Expand/contract migrations
- Backfill jobs for new columns
- Document rollback per migration in `/docs/migrations` during implementation

## Backup

See [BACKUP.md](./BACKUP.md) — PITR required for production.

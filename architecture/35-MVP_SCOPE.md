# 35. MVP Scope

## In MVP (Must)

1. User/Auth + RBAC
2. Multi-app `app_id` plumbing
3. Product catalog (course, document, bundle types)
4. Course → sections → lessons → contents
5. Video upload → process → signed HLS playback
6. Document upload → authorized preview/download
7. Access policies + Entitlement SoR + Access Engine
8. Checkout + one payment adapter (Stripe or chosen) + webhook idempotency
9. Bundle purchase fulfillment
10. Rewarded access with SSV verification + quotas
11. Student learning + progress + continue learning
12. Teacher draft/publish workflow
13. Admin basics (users, catalog, orders, config, audit)
14. Remote Config / feature flags
15. In-app + email notification for purchase/completion
16. Analytics event emission
17. Security baseline (see SECURITY.md)
18. Docs + Cursor rules kept current

## Explicitly deferred

Advanced community · ML recommendations · full affiliate payouts · AI generation UX · offline video DRM · marketplace split · multi-region active-active

## MVP exit criteria

- End-to-end purchase grants access
- Free preview works without purchase
- Reward unlock cannot be spoofed without SSV
- Paid video URL expires
- Teacher isolation tests pass
- Backup/restore drill documented at least once on staging

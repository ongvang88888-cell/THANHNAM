# 8. Dependency Graph

## Allowed

```
mobile-student ──► @edu/shared-core
student-web    ──► @edu/shared-core, @edu/design-system
teacher-web    ──► @edu/shared-core, @edu/design-system
admin-web      ──► @edu/shared-core, @edu/design-system
storefront-web ──► @edu/shared-core, @edu/design-system

@edu/api ──► education-core, monetization-core, media-core, shared-core
@edu/workers ──► media-core, monetization-core, shared-core

education-core ──► shared-core
monetization-core ──► shared-core
media-core ──► shared-core

media-core ─X→ monetization-core   (access checks via Access API / ports)
education-core may *query* AccessPort (interface in shared/monetization facade)
```

## Forbidden

- Apps importing another app’s screens/business logic
- Shared-core importing education/monetization/media
- Direct Stripe/AdMob SDK calls inside domain services (adapters only)
- Client packages containing entitlement decision logic beyond display mapping

## Runtime call flow (lesson play)

```
Client → API CurriculumController
      → AccessService.evaluate(user, lesson)
      → EntitlementRepository + PolicyEngine
      → if CAN_ACCESS → MediaService.signPlayback(videoId, user, ttl)
      → return decision + short-lived URL
```

## Provider adapters

```
PaymentPort ← StripeAdapter | PlayBillingAdapter | AppleIapAdapter | VnPayAdapter
AdsRewardPort ← AdMobSsvAdapter | (future networks)
StoragePort ← S3Adapter | R2Adapter | GcsAdapter
TranscodePort ← MediaConvertAdapter | MuxAdapter | FfmpegWorkerAdapter
AiPort ← OpenAiAdapter | GeminiAdapter | NullAiAdapter
PushPort ← FcmAdapter | ApnsAdapter
EmailPort ← SesAdapter | ResendAdapter
```

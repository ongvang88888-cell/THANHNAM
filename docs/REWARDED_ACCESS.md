# Rewarded Access Architecture

## Intent

Allow unlocking **configured** content by watching a rewarded ad — with server verification, quotas, and temporary entitlements. Not click fraud. Not client-trusted rewards.

## Official constraint

Google AdMob **Server-Side Verification (SSV)** callbacks must be signature-verified (ECDSA) before granting rewards. See [AdMob SSV](https://developers.google.com/admob/android/ssv).

## Components

| Component | Role |
|-----------|------|
| `RewardPolicy` | What can unlock, duration, daily quota, cooldown, per-resource caps |
| `RewardService` | Eligibility + orchestration |
| `RewardTransaction` | Immutable attempt/verify record |
| `RewardValidation` | Provider signature & replay checks |
| `RewardGrant` | Creates entitlement via EntitlementService |

## Sequence

```
Client                API                 AdMob                Worker/DB
  | eligibility |→ check quota/policy → 200 {token, nonce}
  | show ad     |                     |
  |             |←—— SSV GET verify ——|
  |             | verify verify ECDSA, nonce, tx id unique
  |             |      grant entitlement (hours/lesson)
  | refresh access → CAN_ACCESS
```

## Eligibility API

Checks:

- `ads_enabled` / `rewarded_enabled` remote config
- User not over daily quota
- Resource policy includes `REWARDED_AD`
- Cooldown since last grant
- Content not already permanently owned (optional skip)

Returns opaque `rewardSessionId` bound to user+resource+expiry (stored server-side). Pass as AdMob `custom_data`.

## Verification

1. Receive SSV query params (`transaction_id`, `signature`, `key_id`, `user_id`, `custom_data`, …)
2. Verify signature with AdMob public keys
3. Match `custom_data` → rewardSessionId → user/resource
4. Reject replayed `transaction_id`
5. Grant entitlement `source=REWARD`, `expiresAt=now+duration`
6. Record analytics `reward_granted` / `reward_denied`

## Grant shapes

- Unlock one lesson
- Unlock one document
- Unlock for X hours
- Daily reward pack (policy-defined)

## Anti-abuse

- Quotas & cooldowns
- Device/IP rate limits
- SSV mandatory for production grants
- Anomaly detection hooks (sudden unlock spikes)
- No incentive design for fake clicks/impressions

## Provider abstraction

`AdsRewardPort.verifySsv(payload)`; AdMob adapter first; others later.

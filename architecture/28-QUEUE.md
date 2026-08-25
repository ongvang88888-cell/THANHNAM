# 28. Queue Architecture

## Broker

Redis + BullMQ (MVP). Swap to SQS/PubSub via port if needed.

## Queues

`media.transcode` · `media.scan` · `email.send` · `push.send` · `payments.webhook` · `rewards.ssv` · `analytics.sink` · `search.index` · `entitlements.reconcile`

## Patterns

- At-least-once delivery
- Idempotent handlers
- Exponential backoff
- DLQ + admin replay
- Priority for payment/entitlement over analytics

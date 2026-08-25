# Subscription Architecture

## Model

Product type `SUBSCRIPTION` / `PREMIUM_LIBRARY` → plan defines polling period & entitled catalog rules (all / category / tag / list).

## Lifecycle

`incomplete` → `active` → `past_due` → `canceled` / `expired`

Events stored in `subscription_events` with unique provider event ids.

## Access

Active subscription grants entitlement `resourceType=subscription|library` evaluated by Access Engine catalog rules.

## Providers

Stripe Billing · Play subscriptions · App Store subscriptions — via adapters; acknowledge store differences in Payment Policy Config.

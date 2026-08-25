# Analytics Architecture

## Principles

- AnalyticsPort abstraction (Segment/PostHog/BigQuery sink/…)
- Fail-open: analytics outage must not break learning/checkout
- No unnecessary PII; prefer user_id pseudonymous within app

## Required events (MVP+)

app_open · signup · login · course_view · lesson_view · video_start · video_complete · video_progress · document_open · document_download · search · wishlist · bookmark · quiz_start · quiz_complete · checkout_start · payment_success · payment_failed · refund · subscription_start · subscription_cancel · ad_request · ad_completed · reward_granted · reward_denied · paywall_view · bundle_view · bundle_purchase

## Pipeline

Client/API emit → validate schema → queue → sink(s)

## Warehouse (future)

`analytics_events` hot store short retention; export to warehouse for BI.

# 27. Notification Architecture

## Channels

Push · Email · In-app · Local (mobile)

## Events

Purchase success · course available · new lesson · teacher announcement · completion · certificate · promotion · coupon · subscription renew/expire

## Design

- `NotificationPort` per channel
- User preferences respected
- Template registry
- Async via queue
- Idempotent send keys

## Failure

Non-blocking; retry with DLQ; never roll back purchase because email failed.

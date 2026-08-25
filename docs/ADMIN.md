# Admin Architecture

## Modules

Dashboard · Users · Teachers · Courses · Products · Bundles · Categories · Lessons · Videos · Documents · Orders · Payments · Refunds · Subscriptions · Coupons · Promotions · Rewards · Affiliates · Reviews · Quizzes · Certificates · Notifications · Analytics · Reports · Remote Config · Feature Flags · Audit Logs · System Settings

## Privileged actions

- Grant/revoke entitlements (reason required)
- Refunds
- Force unpublish
- Config changes
- Impersonation (if ever enabled): break-glass + full audit — default **off**

## Safety

- Dual control for destructive ops (future)
- All admin mutations → `audit_logs`
- Read replicas for heavy reports

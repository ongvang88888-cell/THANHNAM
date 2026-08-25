# NEW_APP.md — Creating App #2 Without Rewriting Core

## Checklist

1. Read Shared Core, Cursor rules, Architecture
2. Create `apps` row: slug, branding, enabled_modules, monetization_config
3. Configure domains / deep links / store product IDs
4. Enable only needed modules (flags)
5. Theme via design tokens — do not fork components unless necessary
6. Wire mobile/web shells to same API with `X-App-Id`
7. Add Remote Config overrides for the app
8. Do **not** copy Payment / Auth / Entitlement / Ads / Analytics / Security

## Allowed app-specific code

- Branding assets
- Marketing pages
- Store listing metadata
- Optional vertical UX chrome
- Feature flag defaults

## Forbidden

- New payment business rules outside Monetization Core
- Client-side premium checks as authority
- Forked entitlement logic

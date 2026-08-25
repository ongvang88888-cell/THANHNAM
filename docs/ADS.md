# Ads Architecture

## Scope

- Rewarded ads for content unlock (primary)
- Optional interstitial/banner frequency via Remote Config (must not confuse with lessons)

## UX rules

- Clear labeling: advertising vs learning content
- Explain unlock scope/duration/limits before Watch Ad
- No dark patterns

## Remote Config keys

`ads_enabled` · `rewarded_enabled` · `reward_limit` · `reward_duration` · `interstitial_frequency`

## Compliance

Follow AdMob / store policies; age signals for kids apps (kids app = ads policy review before enable).

# 26. Recommendation Architecture

## Port

`RecommendationService.recommend(userId, surface, limit)`

## MVP strategy (rule-based)

- Same category as last viewed
- Popular in app (purchase/view counts)
- New published
- Similar tags
- Exclude owned if configured

## Future

Feature store + ML model; same port.

## Failure

Return empty/popular fallback; never block home page.

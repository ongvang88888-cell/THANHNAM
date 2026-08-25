# Student Architecture

## Surfaces

- Home: Continue · Recommended · Popular · New · Categories · Free · Premium · Bundles · Search
- Library: My Courses · My Documents · Purchases · Favorites · Bookmarks · History · Notes · Certificates
- Player / Reader experiences
- Profile · Notifications

## Continue Learning

Query latest non-completed `lesson_progress` joined with entitled courses; deep link to resume position.

## Access UX states

Every locked item shows reason from AccessDecision — never ambiguous lock.

## Progress model

Store: course % · section rollup · lesson status · video_position_ms · time_spent_ms · last_accessed · quiz scores

Heartbeat every N seconds while playing (throttled).

## Offline (abstraction)

Interface for downloading authorized docs / lesson metadata / progress sync. Video offline only if DRM/policy allows — feature-flagged.

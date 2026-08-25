# Teacher Architecture

## Capabilities

Create/edit courses · upload video/docs · sections/lessons · quizzes/assignments · preview flags · pricing · bundles · submit review · students · analytics · revenue · reviews

## Data isolation

Default queries scoped by `creator_user_id = me` (or org membership). Cross-teacher access requires admin role.

## Publishing workflow

`DRAFT` → `IN_REVIEW` → `PUBLISHED` / `REJECTED` → `ARCHIVED`

Admin gates publication in MVP (configurable auto-publish later).

## Media UX

Show processing states; block publish if required videos not READY.

## Revenue view

Read-only aggregates from orders/entitlements attributed to teacher products (marketplace split future).

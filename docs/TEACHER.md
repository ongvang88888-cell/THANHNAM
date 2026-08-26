# Teacher Architecture

## Capabilities

Create/edit courses · **studio** (sections/lessons incremental) · lesson text + video + research documents · upload video/docs · quizzes · preview flags · pricing · bundles · submit review · students · analytics · revenue · reviews

## Course studio

Teacher web: `/teacher/courses/:id`

- `PATCH /teacher/courses/:id` — title, slug, description, price
- `POST /teacher/courses/:id/sections` · `PATCH/DELETE .../sections/:sectionId`
- `POST /teacher/courses/:id/sections/:sectionId/lessons` · `DELETE .../lessons/:lessonId`
- `PUT /teacher/courses/:id/lessons/:lessonId/content` — `body`, `videoId`, `documentIds[]`
- `POST /teacher/courses/:id/documents` — research PDF/Office **without** a store product
- `PATCH /teacher/courses/:id/curriculum` still replaces the whole tree (legacy)

Course-internal documents have no `productId`. Learners download them via `/documents/:id/content` when they can access a lesson that references the file. Teachers preview their own drafts (creator bypass).

Teachers cannot self-publish; submit for admin review.

## Data isolation

Default queries scoped by `creator_user_id = me` (or org membership). Cross-teacher access requires admin role.

## Publishing workflow

`DRAFT` → `IN_REVIEW` → `PUBLISHED` / `REJECTED` → `ARCHIVED`

Admin gates publication in MVP (configurable auto-publish later).

## Media UX

Show processing states; block publish if required videos not READY.

## Revenue view

Read-only aggregates from orders/entitlements attributed to teacher products (marketplace split future).

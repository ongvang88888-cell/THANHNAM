# Research Notes (patterns only)

Sources consulted while designing the Architecture Package (no UI/code copying):

## Creator LMS / commerce product patterns

- [Teachable](https://www.teachable.com/) — courses, digital downloads, memberships, quizzes, certificates, coupons, global payments
- [Thinkific Pricing](https://www.thinkific.com/pricing/) — bundles, subscriptions/memberships, certificates, native commerce tooling
- Comparative market notes: [FreshLearn comparison](https://freshlearn.com/blog/teachable-vs-thinkific-vs-kajabi/), [StackCompare](https://stackcompare.net/teachable-vs-thinkific-vs-kajabi-2026-online-course-platform-pricing-compared/)

## LMS structural patterns

- [Moodle architecture](https://docs.moodle.org/dev/Moodle_architecture) — course → sections → activities; enrolment; roles/contexts
- [AOSA Moodle chapter](https://aosabook.org/en/v2/moodle.html) — context-based roles
- [Moodle course formats](https://moodledev.io/docs/5.3/apis/plugintypes/format)

## Rewarded ads verification

- [AdMob Android SSV](https://developers.google.com/admob/android/ssv)
- [AdMob iOS SSV](https://developers.google.com/admob/ios/ssv)
- [AdMob Help — validate rewarded views](https://support.google.com/admob/answer/9603226?hl=en)

## Design implication summary

| Pattern observed | Our decision |
|------------------|--------------|
| Sell courses + downloads + memberships | Extensible product types + monetization config |
| Bundles & subscriptions common | First-class bundle + subscription aggregates |
| LMS section/activity tree | Course → Section → Lesson → Content |
| Role/context isolation | RBAC + scoped teacher queries |
| Client reward callbacks insufficient | Mandatory SSV + entitlement grant |

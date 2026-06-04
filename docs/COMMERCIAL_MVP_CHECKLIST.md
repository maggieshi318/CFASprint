# CFA Sprint Commercial MVP Checklist

## Product readiness

- Public landing page clearly explains CFA Level I question bank, mock exams, review tools, and cross-device study.
- Pricing page is accessible before login and routes unauthenticated buyers to account creation.
- Course home gives direct entry to question bank, statistics, and mock exam.
- Free tier and paid tier limits are visible before a user hits a paywall.
- Practice, wrong-book, bookmarks, notes, statistics, and mock exam flows work on phone, tablet, and desktop.

## Billing readiness

- Stripe secret key, webhook secret, app URL, and price IDs are configured in production.
- Stripe success and cancel URLs point to the deployed domain.
- Webhook events activate paid plans and handle subscription cancellation.
- Dev-mode plan activation is disabled or clearly controlled in production.
- Orders page shows purchased plan, status, and expiry date.

## Content readiness

- Question bank rights are confirmed for commercial use.
- Questions, options, answers, and explanations are reviewed for HTML entity issues and malformed text.
- Mock exam banks have clear labels and expected question counts.
- CFA trademark disclaimer is present in Terms or footer copy.

## Account and trust

- Email verification is enabled with production SMTP.
- Password reset email works end to end.
- Privacy Policy and Terms are visible from public and logged-in pages.
- Admin-only routes are protected.
- User progress, notes, bookmarks, wrong questions, and mock results persist after logout/login.

## Device and deployment

- Build passes with `npm run build`.
- Desktop, tablet, and mobile viewports are manually checked for landing, pricing, login, register, course home, question bank, practice session, and mock exam.
- PWA manifest, icon, service worker, and theme color are verified.
- Production API base URL is configured for web/PWA/mobile builds.
- Database backup and restore process is documented before launch.

## Growth launch

- Add analytics for registration, practice start, mock start, checkout start, checkout success, and paywall hits.
- Add onboarding prompts that send new users to their first topic drill.
- Add a concise FAQ on pricing/refunds/device support.
- Prepare three acquisition pages or ads: "CFA Level I question bank", "CFA Level I mock exam", and "CFA Level I study plan".

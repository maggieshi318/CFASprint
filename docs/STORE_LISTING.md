# App Store & Google Play Listing Kit

Use this checklist when submitting **CFA Sprint** to Apple App Store and Google Play.

## Required URLs

| Item | URL (replace domain) |
|------|----------------------|
| Privacy Policy | `https://yourdomain.com/privacy` |
| Terms of Service | `https://yourdomain.com/terms` |
| Support email | `support@cfasprint.app` |
| Marketing site | `https://yourdomain.com` |

Deploy the web app so `/privacy` and `/terms` are publicly accessible before store review.

## App descriptions (English)

### Short description (Google Play, 80 chars)

```
CFA Level I prep: practice questions, mocks, analytics. Study anywhere.
```

### Subtitle (App Store, 30 chars)

```
CFA Level I Exam Prep
```

### Full description

```
CFA Sprint helps international CFA Level I candidates prepare with focused practice and mock exams.

• 10-topic curriculum coverage with LOS tagging
• Smart practice filters (topic, LOS, difficulty, unanswered)
• Timed mock exams with score breakdown by topic
• Wrong-book, favorites, and progress dashboard
• Pro plans: full bank access and unlimited mocks

Study on phone, tablet, or desktop. Install once, sync your progress when you sign in.

CFA Sprint is an independent prep tool and is not affiliated with or endorsed by CFA Institute.
```

## Keywords (App Store)

```
CFA, CFA Level 1, exam prep, finance, mock exam, question bank, study
```

## Category

- **Primary**: Education
- **Secondary**: Finance (if available)

## Screenshots (capture from app)

Minimum set (portrait phone):

1. Dashboard — progress stats + curriculum coverage
2. Practice — question with topic/LOS metadata
3. Mock exam — timed session in progress
4. Mock report — topic breakdown after submit
5. Pricing — subscription plans
6. Review — wrong questions / favorites

Recommended sizes:

- **iOS**: 6.7" (1290×2796) and 6.1" (1179×2556)
- **Android**: Phone 1080×1920 minimum

Tip: use demo account `candidate@example.com` with premium enabled for screenshots.

## Review notes (for Apple/Google)

```
Demo account:
Email: candidate@example.com
Password: password123

The app requires login. Premium features can be tested via in-app Subscribe (Stripe test mode) or the demo account if pre-provisioned.

Privacy policy: https://yourdomain.com/privacy
```

## Compliance

- [ ] Privacy policy live and linked in store console
- [ ] Data safety form (Google) — account email, study activity, purchases via Stripe
- [ ] Export compliance — standard encryption only (HTTPS)
- [ ] Age rating — 4+ / Everyone (education, no restricted content)
- [ ] In-app purchases declared (Stripe subscriptions)

## Assets to prepare

| Asset | Spec |
|-------|------|
| App icon | 1024×1024 PNG (no transparency for iOS) |
| Feature graphic | 1024×500 (Google Play) |
| Promo video | Optional 15–30s screen recording |

## Post-approval

- Monitor Stripe webhooks and `/admin/analytics`
- Run `npm run preflight:strict` on production before each release
- Bump `version` in `package.json` and native projects each submission

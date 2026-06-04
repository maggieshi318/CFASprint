# CFA Sprint (Web + API)

English-first CFA Level I prep MVP for global candidates.

- Frontend: React + TypeScript + Vite
- Backend: Express + SQLite + JWT auth

## Quick Start (Development)

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` starts both:

- Web app: Vite dev server (proxies `/api` to the backend)
- API server: `http://localhost:8787`

## Demo Login

| Role | Email | Password |
|------|-------|----------|
| Student | `candidate@example.com` | `password123` |
| Admin | `admin@example.com` | `admin123` |

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` enables static file serving |
| `PORT` | `8787` | HTTP port |
| `JWT_SECRET` | dev default | **Must change in production** |
| `DB_PATH` | `./server/data/cfa.db` | SQLite database file path |
| `CORS_ORIGIN` | empty | Comma-separated origins (optional) |
| `APP_URL` | `http://localhost:5173` | Stripe checkout success/cancel redirects |
| `STRIPE_SECRET_KEY` | empty | Stripe secret key (dev mode works without it) |
| `STRIPE_WEBHOOK_SECRET` | empty | Stripe webhook signing secret |
| `STRIPE_PRICE_FULL_ACCESS` | empty | Stripe Price ID for the one-time Full Access payment |
| `FULL_ACCESS_PAYMENT_URL` | empty | Optional hosted payment link used before Stripe Checkout is configured |

## Production (Local)

Build the frontend and run the unified server (API + static web):

```bash
npm install
npm run build
set NODE_ENV=production
set JWT_SECRET=your_long_random_secret
npm start
```

Open `http://localhost:8787`.

On Linux/macOS, use `export NODE_ENV=production` instead of `set`.

## Docker

Build and run with persistent SQLite volume:

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET

docker compose up --build -d
```

App URL: `http://localhost:8787`

Data is stored in the Docker volume `cfa_data` (mapped to `/app/server/data`).

Stop:

```bash
docker compose down
```

## Smoke Tests (E2E API Regression)

With the server running (dev or production):

```bash
npm run test:e2e
```

Optional base URL:

```bash
BASE_URL=http://localhost:8787 npm run test:e2e
```

Covers: health check, login, practice submit, stats, sprint plan, mock exam flow, admin CSV import/delete, auth email flows.

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm run build` and `npm run test:e2e` on push/PR to `main` or `master`.

## Current Product Scope

- **Authentication**: login, register, JWT protected routes, session persistence
- **Onboarding**: exam date + weekly goal wizard for new accounts
- **Sprint plan**: 8-week topic roadmap, weekly goal progress, exam countdown
- **Dashboard**: study stats, topic progress, mock exam history, weekly goal bar, weak-area recommendations
- **Practice**: answer flow, explanations, favorites
- **Review**: wrong questions and favorites with LOS/tag filters
- **Mock Exam**: timed sessions, submit scoring, topic breakdown, session replay
- **Admin**: question CRUD, CSV import with row-level errors
- **Pricing & Billing**: plan list, Stripe Checkout (or dev-mode activation), subscription status, free-tier limits
- **i18n**: English/Chinese UI toggle (persisted per user)

## API Endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `GET /api/auth/me`
- `PATCH /api/user/settings` (locale, reminders, exam date, weekly goal, onboarding)
- `GET /api/sprint-plan`
- `GET /api/curriculum`
- `GET /api/questions` (supports `topic`, `los`, `difficulty`, `unanswered` filters)
- `POST /api/questions/:id/submit`
- `GET /api/stats`
- `GET /api/review`
- `POST /api/favorites/:id/toggle`
- `GET /api/pricing`
- `GET /api/billing/status`
- `POST /api/billing/checkout`
- `POST /api/billing/webhook`
- `POST /api/mock-sessions/start`
- `GET /api/mock-sessions/current`
- `POST /api/mock-sessions/current/answer`
- `POST /api/mock-sessions/current/tick`
- `POST /api/mock-sessions/current/submit`
- `GET /api/mock-sessions/history`
- `GET /api/mock-sessions/:id`
- `POST /api/admin/questions`
- `DELETE /api/admin/questions/:id`
- `POST /api/admin/questions/import-csv`

## Data Storage

- SQLite DB: `server/data/cfa.db` (or path from `DB_PATH`)
- Auto-seeded demo users and starter question bank on first run

## Deployment Checklist

See full guide: [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)

Quick commands:

```bash
npm run build
npm run preflight          # standard (dev-friendly)
npm run preflight:strict   # production gate
npm run test:e2e
```

1. Set a strong `JWT_SECRET`
2. Configure `SMTP_*` for auth emails (production)
3. Configure Stripe live keys + webhook
4. Run `npm run build` (or use Docker image)
5. Start with `NODE_ENV=production`
6. Mount/persist `DB_PATH` directory
7. Put HTTPS reverse proxy (nginx/Caddy) in front for public traffic

## Stripe Setup

1. Create one Stripe product/price for Full Access at AED 99.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_FULL_ACCESS`, and `APP_URL`.
3. Forward webhooks to `POST /api/billing/webhook` and set `STRIPE_WEBHOOK_SECRET`.
4. Without Stripe keys, clicking **Subscribe** activates the plan locally (dev mode).

### Free Tier Limits

- 20 question submissions per day
- 1 mini mock (max 3 questions)

Paid Full Access users and admins have full access.

## Auth Email Flows

Password reset and email verification use signed tokens stored in SQLite.

- **Production**: set `SMTP_HOST`, `SMTP_FROM`, and credentials — emails sent via Nodemailer
- **Development**: without SMTP, links/tokens appear in API `dev` payloads and server console

Supported: SendGrid, SES SMTP, Mailgun, Postmark, or any SMTP relay.

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | Port (587 recommended) |
| `SMTP_SECURE` | `true` for TLS on port 465 |
| `SMTP_USER` / `SMTP_PASS` | Auth credentials |
| `SMTP_FROM` | From address, e.g. `CFA Sprint <noreply@domain.com>` |

## PWA (Mobile / Tablet)

The web app ships as an installable PWA:

- Service worker + offline shell via `vite-plugin-pwa`
- Add to Home Screen on iOS/Android supported browsers
- Standalone display mode with theme color `#2563eb`

## Native Mobile (Capacitor)

Package for App Store / Google Play:

```bash
set VITE_API_BASE=https://api.yourdomain.com/api
npm run cap:sync
npm run cap:android   # or cap:ios on macOS
```

Full guide: [docs/MOBILE.md](docs/MOBILE.md)

Sample commercial CSV for bulk import: `data/sample-commercial-bank.csv`

Store listing kit: [docs/STORE_LISTING.md](docs/STORE_LISTING.md)

## Settings & Reminders

- `/settings` — language + daily study reminder time
- Reminder notifications use Capacitor Local Notifications on iOS/Android
- User preferences stored in SQLite (`reminder_enabled`, `reminder_time`)

## Legal Pages

Public routes required for app store review:

- `/privacy` — Privacy Policy
- `/terms` — Terms of Service

## Question Bank

- 22 seed questions across all 10 CFA Level I topic areas
- LOS metadata on every question
- Practice filters: topic, LOS, difficulty, unanswered-only
- Curriculum overview on Dashboard (`GET /api/curriculum`)
- Admin CSV template/export/import with quoted-field support (`GET /api/admin/questions/csv-template`, `export-csv`)

## Admin Analytics

- `GET /api/admin/analytics` — conversion, retention, mock completion, 7-day trends
- Admin UI: `/admin/analytics`

## Next Steps

1. Capture store screenshots using [docs/STORE_LISTING.md](docs/STORE_LISTING.md)
2. Configure Firebase for production push ([docs/PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md))
3. Import licensed question bank: `npm run import:questions:all`

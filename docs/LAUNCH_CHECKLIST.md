# CFA Sprint Launch Checklist

Use this before accepting real payments or sending auth emails in production.

## 1. Environment

Copy `.env.example` to `.env` and set:

| Variable | Production requirement |
|----------|------------------------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Random 32+ char secret (never use dev default) |
| `APP_URL` | Public HTTPS URL, e.g. `https://app.yourdomain.com` |
| `DB_PATH` | Persistent volume path inside container/VM |
| `CORS_ORIGIN` | Your public origin if API is on another domain |

Run:

```bash
npm run build
npm run preflight:strict
npm run test:e2e
```

## 2. Stripe Live Mode

1. Switch Stripe Dashboard to **Live** mode.
2. Create a live Product/Price for:
   - Full Access AED 99 (`STRIPE_PRICE_FULL_ACCESS`)
3. Set live keys in `.env`:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from live webhook endpoint)
4. Configure webhook endpoint:
   - URL: `https://your-domain.com/api/billing/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
5. Test with a real card in Stripe test clock or small live charge, then refund.
6. Confirm user `plan` updates in SQLite after checkout + webhook.

## 3. SMTP (Auth Emails)

Set in `.env`:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM="CFA Sprint <noreply@yourdomain.com>"
```

Verify:

- Register a new account → verification email arrives
- Forgot password → reset email arrives
- Links use `APP_URL` (HTTPS)

Supported providers: SendGrid, AWS SES SMTP, Mailgun, Postmark, any SMTP relay.

## 4. Docker / Hosting

```bash
docker compose up --build -d
```

Checklist:

- [ ] HTTPS reverse proxy (nginx/Caddy) terminates TLS
- [ ] SQLite volume mounted at `/app/server/data`
- [ ] Health check: `GET /api/health`
- [ ] Logs monitored for `[mailer]` and Stripe webhook errors

## 5. Post-Launch Smoke

1. Register → verify email → login
2. Practice 3 questions (free tier)
3. Subscribe (Stripe Checkout) → premium unlocked
4. Start full mock exam
5. Admin CSV import (optional)

## 6. Rollback

- Keep previous Docker image tag
- Stripe: disable checkout temporarily in Dashboard
- DB: backup `cfa.db` before migrations

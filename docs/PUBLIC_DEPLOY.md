# Public Deployment

This setup runs the app behind Caddy, which provides public HTTPS automatically.

## 1. Prepare a Server

Use a Linux VPS with Docker and Docker Compose installed.

Open these firewall ports:

- `80`
- `443`

## 2. Point a Domain

Create a DNS `A` record:

```text
app.yourdomain.com -> your_server_public_ip
```

Wait until DNS resolves before starting Caddy.

## 3. Create Production `.env`

On the server, create `.env` in the project folder:

```env
APP_DOMAIN=app.yourdomain.com
APP_URL=https://app.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com
JWT_SECRET=replace_with_a_long_random_secret_32_chars_or_more
```

Optional, for payments and emails:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FULL_ACCESS=price_...
FULL_ACCESS_PAYMENT_URL=https://your-payment-provider.example/pay/full-access

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_smtp_password
SMTP_FROM="CFA Sprint <noreply@yourdomain.com>"
```

## 4. Start Public App

```bash
docker compose -f docker-compose.public.yml up --build -d
```

Then open:

```text
https://app.yourdomain.com
```

## 5. Verify

```bash
docker compose -f docker-compose.public.yml ps
curl https://app.yourdomain.com/api/health
```

## 6. Update

After pulling new code:

```bash
docker compose -f docker-compose.public.yml up --build -d
```

SQLite data persists in the `cfa_data` Docker volume.

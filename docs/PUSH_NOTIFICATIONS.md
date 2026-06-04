# Remote Push Notifications (FCM / APNs)

CFA Sprint supports campaign push messages via Firebase Cloud Messaging (Android + iOS through FCM).

## Architecture

1. Mobile app registers for push (`@capacitor/push-notifications`)
2. Device token sent to `POST /api/push/register`
3. Admin sends broadcast via `POST /api/admin/push/broadcast` (Analytics page UI)
4. Server sends multicast through `firebase-admin` when configured

Local **study reminders** use `@capacitor/local-notifications` and do not require Firebase.

## Firebase setup

1. Create a Firebase project
2. Add Android app (`com.cfasprint.app`) and download `google-services.json` into `android/app/`
3. Add iOS app and upload APNs key in Firebase console
4. Create a service account with Firebase Admin SDK role
5. Download JSON key and set env:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json
```

Or inline JSON (CI):

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## Test flow

1. Build mobile app with `VITE_API_BASE` pointing to your API
2. Login → Settings → **Enable campaign push**
3. Admin login → Analytics → **Send broadcast**
4. Dev mode (no Firebase): tokens logged to server console

## Bulk question import

Import CSV banks directly into SQLite:

```bash
npm run import:questions data/sample-commercial-bank.csv
npm run import:questions:all
```

CSV format matches admin template (`topic,los,exam_year,...`).

## Study streak

Dashboard shows consecutive days with at least one practice submission (`studyStreak` in `GET /api/stats`).

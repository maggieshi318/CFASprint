# CFA Sprint — Mobile App (Capacitor)

Package the web app for iOS and Android using [Capacitor](https://capacitorjs.com/).

## Prerequisites

- Node.js 20+
- **Android**: Android Studio + SDK
- **iOS** (macOS only): Xcode 15+

## 1. Configure API URL for mobile

Mobile builds cannot use the Vite dev proxy. Point the app at your deployed API:

```bash
# Example: production API
set VITE_API_BASE=https://api.yourdomain.com/api
npm run build
```

For Android emulator hitting a local API on your PC:

```bash
set VITE_API_BASE=http://10.0.2.2:8787/api
npm run build
```

For a physical device on the same Wi‑Fi (replace with your LAN IP):

```bash
set VITE_API_BASE=http://192.168.1.100:8787/api
npm run build
```

## 2. Sync web build to native projects

```bash
npm install
npm run build
npm run cap:sync
```

## 3. Android

```bash
npm run cap:android
```

In Android Studio:

1. Open the generated `android/` project
2. Run on emulator or device
3. Ensure `VITE_API_BASE` is reachable from the device/emulator

Release checklist:

- [ ] Update `appId` in `capacitor.config.ts` if needed
- [ ] Generate signed APK/AAB
- [ ] Test login, practice, mock exam, Stripe checkout (live/test)

## 4. iOS (macOS)

```bash
npm run cap:ios
```

In Xcode:

1. Open `ios/App/App.xcworkspace`
2. Set development team & bundle ID
3. Run on simulator or device

App Store checklist:

- [ ] Privacy policy URL
- [ ] In-app purchase / Stripe compliance review notes
- [ ] iPad layout smoke test

## 5. Sample commercial question bank

Import the bundled sample CSV from Admin → Question Bank:

- File: `data/sample-commercial-bank.csv`
- Or download template in admin UI and paste rows

## Scripts

| Command | Description |
|---------|-------------|
| `npm run cap:sync` | Build web + copy to native projects |
| `npm run cap:android` | Open Android Studio |
| `npm run cap:ios` | Open Xcode (macOS) |

## PWA vs Native

- **PWA**: `npm run build` + deploy — Add to Home Screen, no store review
- **Capacitor**: store distribution, push notifications (future), deeper OS integration

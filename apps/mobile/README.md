# @jobab/mobile

Expo (React Native) merchant app for Jobab — inbox + orders + push notifications, sharing the API contract with the web app via `@jobab/shared`.

## Run it

```bash
# from repo root
pnpm install
pnpm --filter @jobab/shared build
pnpm --filter @jobab/backend dev          # API on :3000
pnpm --filter @jobab/mobile start          # Expo Metro on :8081

# On your phone:
# 1. Install "Expo Go" from the App Store / Play Store
# 2. Scan the QR code Metro prints
# 3. The app figures out your machine's LAN IP via Expo's hostUri and
#    talks to backend at http://<your-LAN-IP>:3000
```

If your phone can't reach the dev machine over LAN, use `pnpm start --tunnel`.

## Notes

- **Session cookie via Authorization-style header.** Mobile can't receive
  HttpOnly browser cookies, so we capture the `Set-Cookie` value at login,
  stash it in `expo-secure-store`, and send it back as `Cookie: jobab_session=…`.
  The backend's AuthGuard reads either form.
- **Push** uses the Expo Push API which routes to APNs/FCM. The backend
  has `PushService.notifyUser(userId, ...)` plumbed; wire it where you want
  alerts (handoff, new order, …).
- **NativeWind** for styling — same Tailwind tokens as the web app where
  possible. Static colors (no CSS vars on RN).
- Auth state lives in the secure store. There's no global context yet; each
  screen calls `api.*` directly. Add Zustand / TanStack Query if it grows.

## What's deferred

- Real device build (EAS) — needs an Apple/Google account.
- Image attachment composer.
- Onboarding wizard parity with web.
- A11y / dark-mode parity.

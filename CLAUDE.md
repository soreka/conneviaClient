# Connevia Mobile

React Native (Expo) mobile app for the Connevia / Hayazmiro Studio pilates booking system.

- **Ships to:** Apple App Store + Google Play (via EAS). iOS bundle ID `com.hayazmiro.studio`. Next planned step: `eas build -p ios --profile production` → TestFlight → App Store.
- **Backend:** the Express API in the sibling `connevia-server/` repo. **Production API URL: `https://api.hayazmirostudio.com`** (AWS Lightsail). The app must point at this URL via `expo.extra` in `app.json`, not at any Render URL or raw IP.
- **Public name:** Hayazmiro Studio (bundle: `com.hayazmiro.studio`). Codebase name: Connevia. Note: Auth0 Services ID is `com.hayazmirostudio.auth` — **never confuse Bundle ID with Services ID**.
- **Auth0 social providers configured:** Google, Facebook, Apple (Apple is required for App Store approval because Google/Facebook are present).

## Stack

- **Runtime:** Expo SDK 54 + React Native 0.81 + React 19.1
- **Language:** TypeScript (strict)
- **Styling:** NativeWind 4 (Tailwind 3.4) — `connevia/tailwind.config.js` is the canonical config (NativeWind's Metro plugin reads it). The root-level `tailwind.config.js` is dead.
- **Navigation:** `@react-navigation/native` 7 + native-stack + bottom-tabs
- **State / data:** Redux Toolkit + RTK Query (`src/features/api/apiSlice.ts`). Plain `axios` instance in `src/api.ts` for non-RTK calls.
- **Auth:** Auth0 via `expo-auth-session` (PKCE). Access token stored in `expo-secure-store`. JWT decoded with `jwt-decode`.
- **Animation:** `react-native-reanimated` v4
- **Icons:** `lucide-react-native`
- **i18n:** Arabic-first (RTL). `src/i18n/strings.ar.ts` exists but is not yet adopted — most Arabic strings are hardcoded inline in screens.
- **Package manager:** npm (the lockfile is `package-lock.json`). Server uses pnpm; this client uses npm — that's intentional, don't mix them.

## Scripts

```
npm start              # expo start
npm run android        # expo start --android
npm run ios            # expo start --ios
npm run web            # expo start --web
```

No `lint`, no `test`, no `typecheck` script wired. The root workspace has a `typecheck` script that runs `tsc -p connevia/tsconfig.json` — use that.

## Layout

```
src/
├── api.ts              ← axios instance + interceptors (token, 401 handling)
├── config.ts           ← DEAD, do not import — duplicate of config/env.ts
├── config/
│   └── env.ts          ← canonical env config (Expo Constants extra fields)
├── auth/
│   └── useAuth.ts      ← Auth0 PKCE flow + SecureStore token storage
├── features/
│   ├── api/            ← RTK Query slices (apiSlice, auth slice)
│   ├── auth/           ← LoginScreen stub (DEAD, real Login is in screens/Login)
│   └── ...
├── screens/            ← top-level screens (Booking, Schedule, Profile, Admin*, ...)
├── components/         ← shared UI primitives (Button, AppInput, Screen, Card, ...)
├── navigation/         ← RootNavigator, TabNavigator, AdminTabNavigator
├── mappers/            ← API → domain shape transforms
├── lib/                ← cn() utility
├── hooks/              ← custom hooks (use-toast — likely web-only / dead)
├── types/              ← shared TS types
├── utils/              ← dates, sessionTime, formatPrice, etc.
├── i18n/               ← strings.ar.ts (not yet adopted)
├── constants/          ← colors
└── assets/             ← images/icons
```

## Conventions

- **One source of truth for env:** `src/config/env.ts`. Do not import `src/config.ts` — it's a duplicate slated for deletion.
- **API calls:**
  - For server endpoints under `/v1/...`, use RTK Query slices in `src/features/api/`.
  - For one-off calls outside RTK, use the `apiClient` from `src/api.ts` — it already attaches the bearer token from SecureStore.
  - Don't `fetch()` directly anywhere — you bypass the token interceptor.
- **Auth state:** the canonical "is the user logged in?" lives in the Redux auth slice. Don't store auth state in component-local `useState`. The `useAuth` hook in `src/auth/useAuth.ts` handles the AuthSession PKCE flow but should dispatch to Redux, not own state.
- **Token storage:** access token in `expo-secure-store` under key `connevia.access_token`. Refresh token (once added — see findings) should live in a separate SecureStore slot.
- **Mappers are the type boundary.** Server responses come in as `any`, leave the mapper as a typed domain shape. Never `as any` past a mapper. Use `??` for defaults, not `||` — zero is a valid value for capacity / count / duration.
- **Dates and times:** the server returns ISO strings in UTC. Render in `Asia/Jerusalem` using helpers in `src/utils/dates.ts` (`formatArabicDate`, `formatArabicDayName`). Don't inline `new Date(...).toLocaleString()` per screen — there are already several duplicate copies that need consolidation.
- **Tailwind / NativeWind:** `space-y-*` and `gap-*` don't work in NativeWind 4 the way they do on web. Use explicit margins (`mt-2`, `mt-4`) on child elements.
- **RTL:** the app is Arabic-first. Test layouts in RTL. Don't use `marginLeft/marginRight` — use `marginStart/marginEnd`.

## Known issues

See `.claude/REVIEW_FINDINGS.md` for the full punch list from the 2026-05-23 codebase review. Highest urgency:

1. Time range displayed as `end - start` everywhere in the booking flow ("11:00 - 10:00").
2. No Auth0 refresh-token flow — sessions silently die on access-token expiry (~1 hr).
3. Duplicate token exchange on login (Auth0 rejects the second use of the code → spurious "login failed").
4. Two "back" / "edit avatar" buttons on Profile that look tappable but do nothing.

## Forbidden / red flags

- `console.log` of tokens, user PII, or full Auth0 responses outside a `__DEV__` guard.
- `useState` for auth state in any component (lift to Redux).
- `fetch()` for app data (use RTK Query / `apiClient`).
- `as any` casts to silence TypeScript — fix the type instead.
- Importing `src/config.ts` (dead).
- Adding planning `.md` files at the repo root — keep docs in `docs/` if you must.

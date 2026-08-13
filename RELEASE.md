# Mobile Release Runbook — Hayazmiro Studio

How to build and ship the app to the App Store and Google Play.
Reconstructed 2026-08-13 (the original handoff runbook lived on a drive that no longer exists).

Server deployment is a separate procedure — see `connevia-server/RUNBOOK.md`.

---

## 1. Identities — do not confuse these

| Thing | Value | What it is |
|---|---|---|
| iOS bundle ID | `com.hayazmiro.studio` | native app identity |
| Android package | `com.hayazmiro.studio` | native app identity |
| Auth0 Services ID | `com.hayazmirostudio.auth` | **web** auth identity, Apple Sign-In only |
| Auth0 mobile Client ID | `1OB04BvCaMTJoASnjVQgOp98lyVpSF5T` | the app's Auth0 client |
| Auth0 tenant | `dev-ry4tgo51va623cn8.eu.auth0.com` | |
| URL scheme | `hayazmiro-studio` | derived, never hardcoded |
| Redirect URI | `hayazmiro-studio://login-callback` | must match Auth0 **exactly** |
| EAS project | `743f8569-e0da-4f92-aa3c-004fecc4aeab` (`@soreka/hayazmiro-studio`) | |
| API | `https://api.hayazmirostudio.com` | |

Bundle ID and Services ID are different identifiers and are never interchangeable.

---

## 2. Before every build

```powershell
cd E:\Users\Ahmed\connevia-app\connevia    # ← NEVER the workspace root. See §6.1.

npx tsc --noEmit                            # must be 0 errors
npm test -- --runInBand                     # must be all green (--runInBand: Windows EPERM flake)
git status                                  # commit anything you want in the build
npx eas-cli whoami                          # expect: soreka
```

The build is cut from your **local working tree**, not from GitHub — but the commit SHA is
recorded on the build page, so commit first or you will not be able to tell later what shipped.

Confirm the server is current before shipping a client that depends on it
(`connevia-server/RUNBOOK.md` §3.1).

---

## 3. iOS

### 3.1 Build

```powershell
# Recommended first: a standalone internal build to re-validate login off Metro.
npx eas-cli build -p ios --profile preview

# Then the real one. Build number auto-increments (eas.json: autoIncrement).
npx eas-cli build -p ios --profile production
```

Takes 10–30 minutes. `npx eas-cli build:list --limit 5` shows status and the artifact URL.

**Why preview first:** every social login to date has been validated on a *dev client* talking
to Metro. The standalone bundle is what actually ships and exercises a different code path.
Validate it once before trusting it.

### 3.2 Submit to TestFlight

```powershell
npx eas-cli submit -p ios --latest
```

Run this from a **real terminal** (PowerShell/Windows Terminal), not from inside an AI session —
it prompts interactively for App Store Connect credentials and needs readable stdin.

`--non-interactive` requires `ascAppId` plus an ASC API key wired into `eas.json`
(`submit.production.ios`), which is currently `{}`. Wiring it is optional; the interactive path
works without it.

### 3.3 Where to actually look in App Store Connect

Two different places that are easy to mix up:

- **TestFlight tab** → *iOS Builds*. This is where an uploaded build appears, usually within
  5–30 minutes of `eas submit` (it sits in "Processing" first). **If this list is empty, nothing
  has ever been submitted.**
- **Distribution / App Store tab** → a version in state *"Prepare for Submission"* asking for
  screenshots, previews and description. This is the **store listing**, and it exists from the
  moment the app record was created. It says nothing about whether a build was uploaded.

Seeing "Prepare for Submission" and screenshot prompts is therefore **not** evidence that a
build reached TestFlight. Check the TestFlight tab.

### 3.4 TestFlight validation checklist

- [ ] Google, Facebook and Apple login all succeed on the standalone build
- [ ] **"Sign in with Apple" is visible** on the Auth0 login page (guideline 4.8 — mandatory
      because Google and Facebook are offered)
- [ ] App calls `api.hayazmirostudio.com`; data lands in `connevia_prod`
- [ ] Account deletion on a **throwaway** account: Profile → delete → re-login behaves as a
      brand-new signup, and the server logs `auth0Deleted: true`
- [ ] Privacy Policy and Terms links open — including from the **logged-out** login screen
- [ ] The booking calendar shows classes 14 days out
- [ ] Error popups appear in Arabic (try double-booking a bed, or exceeding the weekly cap)

### 3.5 Store listing and review

App Store Connect → your app:

- **App Privacy** — declare collected data: name, email, phone (contact), age/weight/health
  condition (health & fitness), user ID (Auth0). Purpose: app functionality. Encrypted in
  transit. Deletable in-app. Not shared with third parties.
- **Privacy Policy URL** — the published URL from `src/constants/legal.ts`.
- **App Review Information** — provide a demo account. See §5.
- **Review notes** — paste the 3.1.3(e) explanation from §5.
- Screenshots (6.7" and 6.5" iPhone at minimum), description, keywords, support URL.

---

## 4. Android

```powershell
cd E:\Users\Ahmed\connevia-app\connevia
npx eas-cli build -p android --profile production
```

Produces an `.aab`. The signing keystore is already stored on EAS — accept the existing one, do
not generate a new key.

**Account type decides your timeline.** Play Console → Settings → Developer account → Account
details:

- **Organization** — you may go straight to Production after review (hours to ~2 days; a
  first-ever release can take up to a week).
- **Personal** (created after Nov 2023) — Google requires a **closed test with 12+ testers opted
  in for 14 continuous days** before granting production access. This cannot be shortened.
  Recruit testers on day one; it is the longest pole in an Android launch.

**First upload must be manual** through the Play Console web UI (it enrols you in Play App
Signing). After that, `eas submit -p android` can be wired up with a service-account JSON key —
store it outside the repo and never commit it.

Required before any release — Policy → App content:

- Privacy policy URL (same one as Apple)
- **Data Safety** form, matching the Apple declarations above
- **Account deletion URL** — Google requires a **web** URL; in-app deletion alone is not
  sufficient. Simplest compliant answer is the privacy policy page, whose deletion section
  documents the in-app steps plus a contact email.
- Content rating questionnaire (health & fitness, no objectionable content)
- Target audience 18+; declare **no ads**

Store listing needs a **1024×500 feature graphic** — a required design asset with no default.

Auth0 needs no Android-specific configuration; the same callback URL covers both platforms.

---

## 5. Demo accounts for App Review

You need **two** throwaway accounts, and a Gmail `+alias` does **not** create a second account.

- **Account A** — burned by the account-deletion test. Expect it to stop working.
- **Account B** — the demo login you hand to App Review. It must survive.

Rules for account B:

1. **Give App Review a CUSTOMER account, never an admin one.** The customer payment flow was
   deliberately stripped for guideline 3.1.1, but the *admin* screens still display payment
   method and prices. Handing a reviewer an admin login shows them exactly the surface that was
   removed.
2. **Seed it with real-looking data** — completed profile, active subscription, upcoming classes
   inside the review window. A reviewer who opens the app to an empty schedule reports a broken
   app (2.1), not an empty state.
3. **Warm it up.** Sign into it from your own phone a day or two before submitting. A brand-new
   account whose first-ever login comes from Apple's datacenter IP gets flagged by Google's
   anti-fraud, and the reviewer reports "demo account doesn't work."

**Review note to include** (heads off a 3.1.1 challenge over the displayed price):

> Hayazmiro Studio is a booking app for in-person pilates classes at a physical studio in
> Israel. No digital content or services are sold in the app. Prices are shown for information
> only; membership is arranged and paid at the studio. Per guideline 3.1.3(e), this is a
> real-world service outside the scope of In-App Purchase.

---

## 5b. Shipping a fix WITHOUT a build (EAS Update)

Most fixes are JavaScript only, and JavaScript can be pushed over the air to apps that are
already installed. The member reopens the app and has the fix — no build, no store review.

```powershell
cd E:\Users\Ahmed\connevia-app\connevia
npx eas-cli update --branch production --message "fix: whatsapp button"
```

Branch names match the build channels in `eas.json`: `development`, `preview`, `production`.
An update published to `production` reaches builds made with the `production` profile.

### What can and cannot go over the air

**Over the air:** React components, screens, business logic, styles, Arabic copy, images
imported from JS. Practically all day-to-day work.

**Needs a new build:** anything native — adding a library with native code, changing
permissions, editing the native parts of `app.json` (bundle id, scheme, plugins, icons), or
upgrading the Expo SDK.

`runtimeVersion` uses the **`fingerprint`** policy, which computes a hash of the native layer.
That is the guardrail: change anything native and the fingerprint changes, so the update simply
does not reach older builds instead of reaching them and crashing. You cannot ship an
incompatible update by accident. The cost is that after any native change you must build and
distribute again — which was true anyway.

### Before this works

A build must have been made **with `expo-updates` in it**. Builds cut before 2026-08-13 —
including iOS `1.0.0 (2)` and the Android build of the same date — **cannot receive updates**.
The first build after this change is the one that gains the capability.

### Checking what is live

```powershell
npx eas-cli update:list --branch production
npx eas-cli channel:view production
```

Apple explicitly permits this (guideline 3.3.2 allows JavaScript changes through interpreters
like React Native) provided the update does not change what the app fundamentally does.

---

## 6. Traps

### 6.1 Always run EAS from `connevia\`, never the workspace root

The parent `connevia-app\` folder contains a leftover `app.json` of `{"expo":{}}` and its own
`eas.json`. Running EAS there resolves to a junk `connevia-app-root` project instead of the real
one. It has already burned a submit attempt. Check your prompt shows `...\connevia-app\connevia>`
before every EAS command.

### 6.2 Auth0 config is baked into the binary

`app.json` `extra` carries the Auth0 domain and client ID at build time. Changing the Auth0
tenant, migrating to a custom domain, or rotating the client **after** a build invalidates the
shipped app. Do not touch Auth0 configuration between building and submitting.

### 6.3 The Auth0 callback URL must match exactly

Auth0 → Application → Allowed Callback URLs must contain `hayazmiro-studio://login-callback`
character for character — no trailing slash. One entry covers both the dev client and standalone
builds, because the redirect URI is derived from `app.json` rather than hardcoded.

### 6.4 Google rotates OAuth client secrets

If Google login breaks with "login failed" *after* the Google consent screen, check this first:
Google periodically disables old OAuth client secrets. The symptom in the Auth0 logs is "the
provided client secret is invalid". Fix by rotating a new secret in the **Hayazmiro Pilates
Studio** Google Cloud project (the **Web application** OAuth client) and pasting it into Auth0's
Google connection. Facebook and Apple are unaffected.

### 6.5 This project uses npm, the server uses pnpm

Deliberate. `package-lock.json` is the real lockfile here. `.npmrc` sets
`legacy-peer-deps=true` because React Native declares a stricter React peer than the pinned
version — CI and local both need it, so do not delete that file.

### 6.6 Native builds need the VC++ redistributable on Windows

If `eas build` fails locally with `Cannot find module '../lightningcss.win32-x64-msvc.node'`,
the real cause is a missing Visual C++ runtime, not a broken `node_modules`. EAS evaluates
`metro.config.js` locally to fingerprint the project, and that pulls in a native addon.

```powershell
winget install --id Microsoft.VCRedist.2015+.x64 -e
node -e "require('lightningcss')"   # verify
```

---

## 7. Release checklist

```
[ ] Server deployed and verified (connevia-server/RUNBOOK.md §3.1, §3.4)
[ ] Auto-generation ON and the calendar shows classes 14 days out
[ ] npx tsc --noEmit → 0 errors
[ ] npm test -- --runInBand → all green
[ ] Working tree committed and pushed
[ ] cwd is ...\connevia-app\connevia
[ ] iOS preview build → 3 social logins validated standalone
[ ] iOS production build → eas submit → appears under the TestFlight tab
[ ] TestFlight checklist (§3.4) complete
[ ] Demo account B seeded and warmed up
[ ] Store listings, privacy declarations, screenshots, feature graphic
[ ] Submit for review
```

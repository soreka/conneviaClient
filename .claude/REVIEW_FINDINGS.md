# Connevia Mobile — Review Findings (2026-05-23)

Punch list from a whole-codebase review (4 parallel review agents, ~18.5k LOC across `src/`). Sorted by severity. Each item has file:line, what's wrong, why it matters, and the fix.

Mark items `[DONE]` as they're addressed and leave them in this file as a history.

## How to use this file (Bugs Policy)

When implementing a fix from this list:

1. **Write a test for the *intended* behavior** in `src/__tests__/` (or colocated `*.test.tsx`) — not the current buggy behavior. Tests that match buggy behavior lock the bug in.
2. **Mark the test `test.failing(...)`** with a comment referencing the finding ID:
   ```ts
   test.failing('CLIENT-1.1: BookingWizard time range displays start before end', () => {
     // ... render wizard, expect "10:00 - 11:00" not "11:00 - 10:00"
   });
   ```
3. **Apply the code fix.**
4. **Confirm the test now passes** — if it doesn't, the fix is incomplete.
5. **Drop the `.failing` annotation.** The test is now a regression guard.
6. **Mark this finding `[DONE]`** in this file. Leave the text; it's history.

Jest's `test.failing()` is a built-in: passes iff the body throws. CI flags it if a `.failing` test starts passing without being un-marked — so we can't accidentally lose track of a fix.

## Production safety guardrails (must not regress)

1. **No test calls `https://api.hayazmirostudio.com`.** Client tests mock axios via `axios-mock-adapter` or RTK Query test helpers.
2. **Real Auth0 credentials never appear in committed test files.** Stub `expo-auth-session` and `expo-secure-store` in `jest.setup.ts` or per-test mocks.
3. **No real device-only APIs hit during tests.** Mock `expo-secure-store`, `expo-auth-session`, `react-native-reanimated` (via its `/mock` entry point), and any other native module before importing the code under test.

---


---

## 1. CRITICAL — visible to users / breaks the funnel

### 1.1 Time ranges are displayed reversed everywhere [DONE 2026-05-24]
- **Where:** `src/screens/Booking/BookingWizardScreen.tsx:98` — `getTimeRange` returns `` `${getEndTime(...)} - ${formatTime(...)}` ``.
- **Why it matters:** Every session in the booking wizard reads "11:00 - 10:00". `MyBookings` formats start-end correctly, so the inconsistency is also confusing.
- **Fix:** Swap to `` `${formatTime(startsAt)} - ${getEndTime(startsAt, durationMin)}` ``.

### 1.2 Auth0 sessions silently die after access-token expiry [DONE 2026-05-25]
- **Where:** `src/auth/useAuth.ts:61-72` requests scopes `openid profile email` only (no `offline_access`); `src/api.ts:45-72` only catches the `ACCOUNT_DELETED_OR_NOT_BOOTSTRAPPED` path on 401, not generic expiry.
- **Why it matters:** No refresh token is issued, so every request after ~1 hr returns 401 until the user logs in again.
- **Fix:** Add `offline_access` to scopes in `useAuth.ts`. Store `tokenResponse.refreshToken` in SecureStore under a separate key (e.g. `connevia.refresh_token`). Add a 401 handler in `api.ts` that calls `AuthSession.refreshAsync` and retries once, with a request queue to avoid stampedes when multiple requests 401 concurrently.

### 1.3 Duplicate token exchange on login [DONE 2026-05-25]
- **Where:** `src/auth/useAuth.ts:75-174`.
- **Why it matters:** The `useEffect` deps include `request`, which is a new object reference on every render of `useAuthRequest`. The effect re-fires; `exchangeCodeAsync` runs twice; Auth0 rejects the second use of the same auth code → user sees a spurious "login failed" toast.
- **Fix:** Drop `request` from the dep array and capture `request?.codeVerifier` in a ref. Or guard with a `hasExchanged` ref keyed on `response.params.code`.

### 1.4 Auth state has no cross-component source of truth
- **Where:** `src/auth/useAuth.ts:33-39` — `accessToken` and `user` are component-local `useState`.
- **Why it matters:** Each consumer of `useAuth` gets its own copy. After app restart, SecureStore token survives but in-memory `user` is gone. The Redux auth slice in `src/features/api/` is the intended source but the hook doesn't dispatch to it.
- **Fix:** Make `useAuth` dispatch login/logout to Redux. Components should read auth state from `useSelector` against the auth slice, not from `useAuth`.

### 1.5 JWT and full Auth0 response logged unconditionally [DONE 2026-05-25]
- **Where:** `src/auth/useAuth.ts:108` (`console.log("Token response from Auth0:", tokenResponse)`), and similar at `:146`, `:238`.
- **Why it matters:** Production release builds will leak the access token, id token, and decoded user PII to whatever log aggregator picks up console output.
- **Fix:** Wrap in `if (__DEV__) { ... }`, and even in dev log only `Object.keys(tokenResponse)`, not the full object.

### 1.6 Redirect URI scheme is hardcoded to the OLD app scheme — login WILL fail on production builds [DONE 2026-05-25]
- **Where:** `src/auth/useAuth.ts:50-51` — `AuthSession.makeRedirectUri({ scheme: 'connevia', path: 'login-callback' })`.
- **Why it matters:** `app.json:37` declares `"scheme": "hayazmiro-studio"` (renamed when the app was rebranded), and the Auth0 dashboard allowed-callback list was verified on 2026-05-25 to contain `hayazmiro-studio://login-callback`. But this code still generates `connevia://login-callback`. On a production/standalone EAS build the OS only registers the `hayazmiro-studio://` scheme, so the OAuth redirect never returns to the app — **login silently fails for 100% of users.** This does NOT reproduce in Expo Go (which uses the `exp://` proxy scheme) and is masked by the `expo-auth-session` mock in the test suite, which is why it survived to now. Blocks TestFlight harder than CLIENT-1.2: it bites at the login screen, before any session-expiry path is reached.
- **Fix:** Do not hardcode the scheme. Either omit `scheme` and let `makeRedirectUri` derive it from `app.json` (preferred — `makeRedirectUri({ path: 'login-callback' })` reads the manifest scheme), or read it from `Constants.expoConfig?.scheme`. The literal `'connevia'` must not survive. Also update the stale comment at `:48` ("generates: connevia://login-callback").
- **Severity:** CRITICAL — launch blocker.

---

## 2. SERIOUS — silent corruption / dead-end UX

### 2.1 Profile screen has two dead tappable elements [DONE 2026-05-24]
- **Where:** `src/screens/ProfileScreen.tsx:301` (back chevron `onPress={() => {}}`) and `:322` (camera avatar overlay with no `onPress`).
- **Why it matters:** Both look tappable. Users tap, nothing happens.
- **Fix:** Either remove them entirely (Profile is a root tab, so the back arrow shouldn't exist) or wire them — back to Dashboard, camera to an image picker.

### 2.2 `KeyboardAvoidingView` missing on Profile and onboarding wizard [DONE 2026-05-24]
- **Where:** `src/screens/ProfileScreen.tsx` (entire ScrollView), `src/screens/CompleteProfileWizard.tsx` Step 2.
- **Why it matters:** Six `TextInput`s including multi-line health field — keyboard hides the lower inputs and submit button on smaller phones. Worse on the onboarding wizard, which is the *first* funnel step for a new user.
- **Fix:** Wrap with `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>` and add `keyboardShouldPersistTaps="handled"` to the ScrollView.

### 2.3 Mappers falsy-coerce legitimate zero values [DONE 2026-05-24]
- **Where:** `src/mappers/scheduleMappers.ts:191-211`.
- **Why it matters:** `capacity: api.capacity || ... || 0` and `durationMin: api.durationMin || ... || 60` — when the server legitimately returns `0` (closed session, instant slot), the fallback kicks in.
- **Fix:** Use `??` consistently (already done correctly for `bookedCount` at `:215`).

### 2.4 Occupancy override mis-handles "zero bookings" sessions [DONE 2026-05-24]
- **Where:** `src/mappers/scheduleMappers.ts:286-290` — `mapApiToAdminSessionDetails` overrides `occupiedCount` from `bookings.length` when `occupiedCount === 0`.
- **Why it matters:** A legitimately empty session that includes a `bookings: []` array stays at 0 (fine), but if the server sends stale booking data with no occupancy field, the count gets silently inflated.
- **Fix:** Make `mapApiToSessionCore` return a flag indicating whether occupancy was provided, and only fall back to `bookings.length` when no occupancy signal existed.

### 2.5 Time order "normalizer" silently swaps cross-midnight sessions [DONE 2026-05-24]
- **Where:** `src/mappers/scheduleMappers.ts:99-118`.
- **Why it matters:** A 23:00–00:30 session has `startMinutes > endMinutes` and gets reversed to 00:30–23:00.
- **Fix:** Treat `endMinutes < startMinutes` as next-day crossover, not a reversal. Or assert this case never reaches the mapper and warn loudly if it does.

### 2.6 Pervasive `any` in mapper inputs defeats the type boundary
- **Where:** `src/mappers/scheduleMappers.ts:183, 251, 278, 302`.
- **Why it matters:** The whole point of a mapper layer is to *be* the boundary between untrusted API shapes and typed domain objects. `api: any` means callers downstream can rely on fields that may not exist.
- **Fix:** Define `ApiSessionResponse` / `ApiBookingResponse` interfaces with optional fields, type the params with those, and let `as any` casts (if any) live at the call sites where the JSON enters.

### 2.7 No request timeout, no retry policy [DONE 2026-06-02]
- **Where:** `src/api.ts:27-29`.
- **Why it matters:** Flaky cellular connections leave requests hanging indefinitely. Users see infinite spinners.
- **Fix:** `timeout: 15000` at minimum. If you add `axios-retry`, restrict to idempotent verbs (GET/HEAD); never auto-retry POSTs.

### 2.8 `useGetMeQuery` called from multiple components
- **Where:** `RootNavigator.tsx`, `DashboardScreen.tsx`, `ProfileScreen.tsx`, `CompleteProfileWizard.tsx`.
- **Why it matters:** RTK Query dedupes, so it's not a performance issue — but the pattern signals confusion about the canonical "current user" source. Each component re-reads independently.
- **Fix:** Wrap in a `useCurrentUser()` hook with clear semantics (loading / unauth / authed). Document where it should be read.

### 2.9 `refreshMe` and `bootstrap` return different shapes for the same concept
- **Where:** `src/auth/useAuth.ts:228-255` types response as `{ user: ... }`; `:138-147` reads `/v1/me/bootstrap` returning `{ me: ... }` with a different field set (`fullName`, `profileCompleted`).
- **Fix:** Define `MeResponse` once. Pick the field name (server-side change preferred — align on `me`). Route both call sites through one helper.

### 2.10 `request?.codeVerifier!` can throw on bad state
- **Where:** `src/auth/useAuth.ts:103`.
- **Why it matters:** If `request` is null when `response.type === 'success'` somehow arrives, this throws an opaque TypeError instead of a translated user-facing error.
- **Fix:** Early-return with a translated error if `!request?.codeVerifier`.

### 2.11 `BookingWizardScreen` step-1 `canProceed` is brittle [DONE 2026-05-24]
- **Where:** `src/screens/Booking/BookingWizardScreen.tsx:349` — `!!selectedDate && dayGroups.find(...)?.sessionsCount! > 0`.
- **Fix:** Rewrite as `(dayGroups.find(d => d.date === selectedDate)?.sessionsCount ?? 0) > 0`.

### 2.12 "today" is frozen for the lifetime of the schedule screens
- **Where:** `src/screens/Admin/AdminScheduleScreen.tsx:115` and `src/screens/Schedule/index.tsx:46` — `useMemo(() => new Date(), [])`.
- **Why it matters:** Apps that stay open past midnight (common — phones sit unlocked in lockers) keep highlighting yesterday's day.
- **Fix:** Recompute on `AppState` transition to `active`, or use `useFocusEffect` to refresh on screen focus.

### 2.13 `AdminScheduleSettingsScreen` optimistic rollback captures the wrong state
- **Where:** `src/screens/Admin/AdminScheduleSettingsScreen.tsx:97` — `setLocalDays(localDays)` runs as the "rollback" but captures the closure's *post-optimistic* value.
- **Fix:** Snapshot the pre-update state explicitly: `const prevDays = localDays;` *before* calling `setLocalDays(newDays)`. Roll back to `prevDays`.

### 2.14 `AdminCustomersScreen` debounce timer leaks on unmount
- **Where:** `src/screens/Admin/AdminCustomersScreen.tsx:84-94`.
- **Fix:** Add `useEffect(() => () => searchTimeoutRef.current && clearTimeout(searchTimeoutRef.current), [])`.

### 2.15 `isHandlingDeletedAccount` flag may not reset after error in handler
- **Where:** `src/api.ts:43-71`.
- **Fix:** Use `try/finally` to ensure the flag and timer are always cleaned up.

---

## 3. DEAD CODE — delete

- **`src/config.ts`** — duplicate of `src/config/env.ts`. Zero importers.
- **`src/rainy.tsx`** — scratch file rendering "not rainy yet".
- **`testScreen.tsx`** (project root, not `src/`) — `expo-auth-session` debug screen, not imported.
- **`src/screens/ScheduleScreen.tsx`** — 238 LOC, superseded by `src/screens/Schedule/index.tsx`.
- **`src/features/auth/LoginScreen.tsx`** — 153 LOC stub with `setTimeout`-fake login. Real login is `src/screens/Login/index.tsx`.
- **`src/hooks/use-toast.ts`** — imports from `@/components/ui/toast` (a shadcn web component) and is likely unused / will fail on RN. The `TOAST_REMOVE_DELAY = 1000000` is a copy-paste tell. If kept, fix the delay to 5000ms.
- **Root-level `tailwind.config.js`** — NativeWind reads `connevia/tailwind.config.js` via `connevia/metro.config.js`. Delete the root copy.
- **`@types/react-native@^0.72.8` in `devDependencies`** — deprecated since RN 0.71; types ship with `react-native` itself.

---

## 4. ARCHITECTURE / MAINTAINABILITY

### 4.1 Giant screens
- `src/screens/Admin/AdminScheduleScreen.tsx` — 982 LOC. Data fetching + 7 modal states + 7 mutation handlers + inline mock fallback (with `USE_REAL_API` constant always true → ~50 LOC of dead branches) + 235-line `renderDetailsModal()`.
- `src/screens/Admin/AdminCustomerDetailsScreen.tsx` — 927 LOC, four independent editable sections in one component.
- `src/screens/ProfileScreen.tsx` — 771 LOC, near-duplicate edit-mode blocks for personal vs. health sections.
- **Fix:** Extract per-section components and per-modal hooks. Start with `AdminScheduleScreen` — the dead `FALLBACK_MOCK_SLOTS` / `USE_REAL_API` branch can be ripped out as a free first commit.

### 4.2 Duplicated date/time formatters
- `formatArabicDate`, `formatArabicDayName`, `formatTime`, `getEndTime`, and Arabic day-names arrays are reimplemented in `BookingWizardScreen.tsx:67-99`, `MyBookingsScreen.tsx:18-51`, `AdminDashboardScreen.tsx:68-90`, and Dashboard children — while `src/utils/dates.ts` already exports the canonical versions.
- **Fix:** Replace all inline copies with imports from `src/utils/dates.ts`.

### 4.3 Inline Arabic strings everywhere
- `src/i18n/strings.ar.ts` exists with `AR` object — zero importers. Same Arabic strings ("إلغاء", "حفظ", "تم", status labels) are re-declared inline in `ProfileScreen`, `AdminCustomersScreen`, `AdminCustomerDetailsScreen`, `SubscriptionScreen`, etc.
- **Fix:** Adopt `i18n/strings.ar.ts` everywhere, or delete it. (Adopting is cheap and pays off the first time you need to tweak a button label site-wide.)

### 4.4 `TabNavigator` and `AdminTabNavigator` are ~80% identical
- **Where:** `src/navigation/TabNavigator.tsx`, `src/navigation/AdminTabNavigator.tsx`.
- **Fix:** Extract a `BaseTabNavigator` or share `screenOptions`. Also: hard-coded color literals (`#8b5cf6`) instead of NativeWind theme tokens.

### 4.5 `useNavigation<any>()` defeats typed routes
- **Where:** `src/screens/Admin/AdminScheduleScreen.tsx:112`, `src/screens/SubscriptionScreen.tsx:37`.
- **Fix:** Use the proper stack type from the corresponding navigator's param list.

### 4.6 Inconsistent import paths
- `src/api.ts:4` uses `./config/env`, `src/auth/useAuth.ts:4` uses `../config/env`, `src/features/api/apiSlice.ts:4` uses `../../config/env`.
- **Fix:** There's already a `@/...` alias in `src/hooks/use-toast.ts`. Standardize on `@/config/env` everywhere.

---

## 5. PERFORMANCE

### 5.1 Customer list uses `ScrollView + .map`
- **Where:** `src/screens/Admin/AdminCustomersScreen.tsx:260-341`.
- **Why it matters:** Every customer card mounts on screen entry. Once the customer base reaches ~50, scroll perf and memory will degrade.
- **Fix:** Switch to `FlatList` with `keyExtractor`, `windowSize`, `initialNumToRender`. Check `AdminCustomerDetailsScreen` reservations list for the same pattern.

### 5.2 `renderSlotCard` defined inline in `AdminScheduleScreen`
- **Where:** `src/screens/Admin/AdminScheduleScreen.tsx:459`.
- **Why it matters:** FlatList's `renderItem` prop gets a new reference each render, defeating row recycling.
- **Fix:** `useCallback` or extract.

### 5.3 Bed grid recreates `Array.from({length: capacity})` every render
- **Where:** `src/screens/Booking/BookingWizardScreen.tsx:480-488`.
- **Fix:** `useMemo` on capacity.

---

## 6. POLISH

- `src/App.tsx:79-82` — `onStateChange` registers on every nav change unconditionally; the inner log is `__DEV__`-gated but the handler isn't.
- `src/screens/Login/index.tsx:37-62` — `getErrorText` defined inside the component body. Move outside.
- `src/screens/SubscriptionPlansScreen.tsx:50` — `useEffect(..., [])` missing deps `headerOpacity`, `headerTranslateY`.
- `src/screens/Admin/AdminCustomersScreen.tsx:67-69`, `src/navigation/AdminTabNavigator.tsx:25`, and several `[Logout]`/`[Cancel]` logs across screens — gate behind `__DEV__` consistently or remove.
- `src/screens/Schedule/index.tsx:73` — `enabled: hasSessions || true` always evaluates to `true` (dead OR).
- `src/screens/ProfileScreen.tsx:506, 547` — "edit via Auth0" hint duplicated in view and edit modes.
- Tap targets: icon-only `<Pressable>` rows with `padding: 8` around 16-18px icons yield ~32px hit areas — below the 44pt iOS / 48dp Android minimum. Examples: `AdminScheduleScreen.tsx:732-738` (Edit/Trash icons in the bookings list). Add `hitSlop` or bump padding.
- `MyBookingsScreen.tsx:267-275` — initial loading shows generic spinner; better to render header + tabs immediately and put the spinner inside the list area only (the pattern Dashboard already uses with skeletons).
- Fixed "Add Session" button at `AdminScheduleScreen.tsx:888-903` — `position: absolute` with `paddingBottom: 100`. Use `useSafeAreaInsets().bottom` to handle gesture bars.

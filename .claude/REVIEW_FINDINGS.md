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

### 2.7b RTK Query `fetchBaseQuery` has no timeout — the PRIMARY data path is still unbounded [DONE 2026-06-02]
- **Where:** `src/features/api/apiSlice.ts:17-26` (`rawBaseQuery = fetchBaseQuery({ baseUrl, prepareHeaders })`).
- **Why it matters:** CLIENT-2.7 added a 15s timeout to the `axios` instance in `src/api.ts`, but that instance only serves two calls (`POST /v1/me/bootstrap` and `GET /v1/me` in `useAuth.ts`). Nearly all app data (~30 endpoints) flows through RTK Query, whose `fetchBaseQuery` has NO timeout — so the "flaky cellular → infinite spinner" symptom 2.7 was meant to kill is still live on almost every screen. Discovered 2026-06-02 by `connevia-orchestrator` during the CLIENT-2.7 push review.
- **Fix:** add `timeout: 15000` to the `fetchBaseQuery({ ... })` options (RTK Query has a built-in `timeout` arg; on timeout it returns `{ error: { status: 'TIMEOUT_ERROR' } }`). Keep `baseUrl` and `prepareHeaders` unchanged. Do NOT touch the `baseQueryWith401Handler` wrapper or the `isLoggingOut` logic. No retry policy.

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

### 2.15 `isHandlingDeletedAccount` flag may not reset after error in handler [DONE 2026-06-02]
- **Where:** `src/api.ts:43-71`.
- **Fix:** Use `try/finally` to ensure the flag and timer are always cleaned up.

---

## 3. DEAD CODE — delete  [P2 #25 — 6 modules DELETED 2026-06-11, commit ea345ae]

- **`src/config.ts`** [DONE 2026-06-11 — deleted] — duplicate of `src/config/env.ts`. Zero importers.
- **`src/rainy.tsx`** [DONE 2026-06-11 — deleted] — scratch file rendering "not rainy yet".
- **`testScreen.tsx`** (project root, not `src/`) — `expo-auth-session` debug screen, not imported. (Not in scope of the 2026-06-11 `src/` sweep; lives at repo root.)
- **`src/screens/ScheduleScreen.tsx`** [DONE 2026-06-11 — deleted] — 238 LOC, superseded by `src/screens/Schedule/index.tsx`.
- **`src/features/auth/LoginScreen.tsx`** [DONE 2026-06-11 — deleted] — 153 LOC stub with `setTimeout`-fake login. Real login is `src/screens/Login/index.tsx`.
- **`src/hooks/use-toast.ts`** [DONE 2026-06-11 — deleted] — imports from `@/components/ui/toast` (a shadcn web component) and is likely unused / will fail on RN. The `TOAST_REMOVE_DELAY = 1000000` is a copy-paste tell.
- **`src/screens/ui/AtomsDemoScreen.tsx`** [DONE 2026-06-11 — deleted] — UI atoms demo screen, zero importers.
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

---

## 7. LOCALIZATION + UX (2026-06-11 — POST_DEPLOY_FINDINGS follow-up)

These four findings were filed by the orchestrator session of 2026-06-11 off the §3 SESSION HANDOFF open items (#1 Arabic pop-ups, #2 future-weeks booking, #3 booking padding). Tests written FIRST by `fitnessapp-client-side-tester`; the implementer builds the production code next.

### 7.1 ARABIC-ERR-01 — raw English server error strings leak into Arabic toasts/alerts [DONE 2026-06-11]
- **Where:** the error-surfacing call sites listed in ARABIC-ERR-02 prefer `err?.data?.error || '<Arabic fallback>'`. The `||` short-circuits to the English server `error` whenever the server sends a non-empty string, so the Arabic fallback never fires and English (e.g. "Session is full", "Request failed with status code 409") shows to the user.
- **Why it matters:** the product UI is fully Arabic; raw English server text is a visible polish/quality regression and reads as broken to an Arabic-first audience.
- **Fix:** create `src/utils/serverErrors.ts` exporting `arabicServerError(err: unknown, fallback: string): string`. Resolution order:
  1. payload `reason`/`code` matches the known-code map → its Arabic message. Accept BOTH error shapes (RTK Query `err.data`, axios `err.response.data`). Known codes: `NO_SUBSCRIPTION`, `SESSION_BEFORE_SUB_START`, `NO_CREDITS`, `WEEKLY_CAP_REACHED`, `SESSION_OUTSIDE_SUB_RANGE`, `UNKNOWN_PLAN_LIMIT`, `SUBSCRIPTION_NOT_ELIGIBLE`, `PENDING_SUBMISSION_EXISTS`, `NO_CURRENT_SUBSCRIPTION`, `PLAN_MISMATCH`, `NOT_AN_UPGRADE`, `NOT_A_DOWNGRADE`, `INVALID_ACTION`, `NEXT_SUBSCRIPTION_ALREADY_SET`, `INVALID_PLAN`, `VALIDATION_ERROR`, `EMAIL_IN_USE`.
  2. else `error`/`message` string matches a known ENGLISH server string → Arabic. Static: `Session is full`, `You already have a booking for this session`, `Session is not available for booking`, `Session not found`, `Reservation not found`, `Reservation is already canceled`, `Only booked reservations can be canceled`, `No available beds`, `Customer not found`, `Session is already canceled`, `Cannot book session`, `Validation failed`, `Internal server error`, `Not found`. Dynamic (regex): `/^Bed \d+ is already booked$/`, `/^Bed number must be between 1 and \d+$/`.
  3. else the server message CONTAINS Arabic chars (`/[؀-ۿ]/`) → pass through verbatim (server already sends some Arabic, e.g. `لديك طلب قيد المراجعة...`).
  4. else (unknown English / missing / network error) → the per-call Arabic `fallback`.
- **Test file:** `src/utils/__tests__/serverErrors.test.ts` (`test.failing('ARABIC-ERR-01: ...')`, 84 failing + 1 sanity-shape; covers each tier, both shapes, dynamic bed strings, Arabic passthrough, fallback for undefined/null/`{}`/FETCH_ERROR/TIMEOUT_ERROR/Error/bare-string).
- **Exact-match contracts pinned (implementer may change wording, but must update BOTH this note AND the test):** `NO_SUBSCRIPTION` → `لا يوجد اشتراك نشط`; `WEEKLY_CAP_REACHED` → `لقد وصلت إلى الحد الأسبوعي للحجوزات`; `NO_CREDITS` → `لا يوجد رصيد كافٍ في اشتراكك`. All other codes/strings are asserted as "contains Arabic, not the raw code/English, not the generic fallback" only — wording free.

### 7.2 ARABIC-ERR-02 — surfacing sites must adopt `arabicServerError` [DONE 2026-06-11]
- **Where:** `src/screens/Booking/BookingWizardScreen.tsx:361`, `src/screens/MyBookingsScreen.tsx:256`, `src/screens/SubscriptionPlans/SubscriptionPlansScreen.tsx:192`, `src/screens/Admin/AdminDashboardScreen.tsx:347,360`, `src/screens/Admin/AdminPaymentsScreen.tsx:66,91`, `src/screens/Admin/components/AddBookingModal.tsx:74`.
- **Fix:** each file must (a) import `arabicServerError` from `../utils/serverErrors` (relative depth varies) and (b) replace `err?.data?.error || '<fallback>'` / `error?.data?.error || '<fallback>'` with `arabicServerError(err, '<fallback>')` — keeping the existing Arabic fallback string as the 2nd arg. The raw `err?.data?.error ||` / `error?.data?.error ||` interpolation must be GONE from each file.
- **Test file:** `src/screens/__tests__/arabicServerErrorAdoption.test.ts` (`test.failing('ARABIC-ERR-02: ...')`, 18 failing + 1 sanity; per-site: imports helper, no raw `?.data?.error ||`, calls `arabicServerError(`). Source-shape guards (read file content) — the behavioral mapping guarantee lives in ARABIC-ERR-01's unit tests.

### 7.3 SCHED-NAV-01 — Schedule tab can't see/book next week [DONE 2026-06-11]
- **Where:** `src/screens/Schedule/index.tsx:46-61` hardcodes the CURRENT week (`getStartOfWeek(today,0)` → `getEndOfWeek`, `useGetSessionsQuery({from,to})`).
- **Why it matters:** customers can't see/book next week from the Schedule tab even though the booking wizard already covers a 14-day horizon (`BookingWizardScreen.tsx:149-153` generates +14 days).
- **Fix:** add BOUNDED week navigation (offset 0..1 — current + next week, matching the 14-day generation horizon). A "next week" control on the current week; a "back to current week" control once on next week. Switching recomputes BOTH the `useGetSessionsQuery` window (from/to shift ±7 days) AND the WeekDayTabs dates. Clamp offset to `[0, 1]` (no week +2, no past weeks).
- **Accessibility-label contract (pinned by the tests):** next-week control `accessibilityLabel="الأسبوع القادم"`; back-to-current control `accessibilityLabel="الأسبوع الحالي"`. The tests query these via `getByLabelText`. Implementer may change wording but must update the test (tester owns) + this note.
- **Test file:** `src/screens/Schedule/__tests__/ScheduleScreen.weekNav.test.tsx` (1 PLAIN regression guard — initial render = current week, passes now; 7 `test.failing('SCHED-NAV-01: ...')` — next-week present, press shifts window +7d & matches explicit next-week range, day-tabs shift +7d, back-to-current restores window + back-control absent on current week, bounded: no next-week control once on next week, window never advances beyond +7).
- **Note (orchestrator):** §3 #2 flags this is BLOCKED on Ahmed for the DATA side — `dailyMidnightJob` does not auto-generate future sessions, so next-week cards may be empty until a generation feature exists. SCHED-NAV-01 is the FRONT-END window only; it lets the tab REQUEST next week. Empty-next-week is a separate server/data gap.

### 7.4 WIZARD-PAD-01 — Step-3/4 layout void above the pinned button [DONE 2026-06-11]
- **Where:** `src/screens/Booking/BookingWizardScreen.tsx` `renderStep3` (~484-513): ScrollView `className="flex-1 bg-white"`, `contentContainerStyle={{ padding: 16 }}` — content doesn't stretch, so the bed grid hugs the top with a large void above the pinned التالي button. Step-4 (`renderStep4`, ~518-543) has the same shape if needed.
- **Fix:** add `flexGrow: 1` to the Step-3 (and Step-4 if needed) `contentContainerStyle`, and vertically balance the grid (e.g. a `flex-1 justify-center` wrapper around the bed grid).
- **Test file:** `src/screens/Booking/__tests__/BookingWizardScreen.step3Padding.test.ts` (1 `test.failing('WIZARD-PAD-01: ...')` — Step-3 ScrollView contentContainerStyle includes `flexGrow: 1`; + 1 sanity). Minimal source-guard — flexGrow only; classNames/grid-wrapper structure left to the implementer. (Style-only contracts have no observable effect under the RN test renderer, hence source-regex.)
- **Implementer note (2026-06-11):** Step-3 — added `flexGrow: 1` to the contentContainerStyle and wrapped the bed grid in a `flex-1 justify-center` view so it centers between the header and the pinned التالي button. Step-4 — also added `flexGrow: 1` plus a `flex-1` spacer so the cancellation-policy card settles toward the bottom. The wizard's own ScrollViews here are NOT the `27e4cbb` layout-collapse structure (that was a `flex-1` wrapper inside the *CompleteProfileWizard* Screen ScrollView). All 3 sibling Booking test files stay green.

### AUTOGEN-UI — admin settings card for automatic (nightly) session generation [DONE 2026-06-11 — no pre-pinned test (tester adds one after)]
- **Pairs with server FEAT-AUTOGEN-01** (`src/services/sessionGeneration.ts` + `ScheduleSettings.autoGeneration` `{enabled,durationMinutes,capacity,horizonDays}`, midnight cron rolling-horizon generation). The contract: `GET/PUT /v1/admin/schedule/settings` carries an optional `autoGeneration: { enabled: boolean, durationMinutes: number (15-180), capacity: number (1-12), horizonDays: number (1-28, default 14) }`.
- **Built (2026-06-11):**
  - `src/types/scheduleSettings.ts` — new `AutoGenerationSettings` interface; `autoGeneration?` added to `ScheduleSettingsResponse` + `UpdateSettingsRequest`.
  - `src/features/api/apiSlice.ts` (settings endpoints ~722-790) — both the `getAdminScheduleSettings` response type and the `updateAdminScheduleSettings` response + request types extended with the optional `autoGeneration` object (they were explicitly inline-typed).
  - `src/screens/AdminScheduleSettings/components/AutoGenerationCard.tsx` (new) — title 'التوليد التلقائي للحصص', enable `Switch` + one-line explainer ('عند التفعيل، تُنشأ الحصص تلقائياً كل ليلة للأسبوعين القادمين حسب أيام وساعات العمل'); when enabled shows duration presets (reuses `DURATION_PRESETS`, the custom-0 entry filtered out) + bed-count presets (2,3,4,5,6,8). Presentational + local-state; calls `onChange(autoGeneration)`; matches the existing card visual language (white rounded-2xl mx-5, purple-600 accents, RTL flex-row-reverse header, `RefreshCw` lucide icon). Exported from `components/index.ts`.
  - `src/screens/AdminScheduleSettingsScreen.tsx` — renders `AutoGenerationCard` ABOVE `AutoGenerateSection`; syncs `autoGeneration` from server data; `handleSaveAutoGeneration` persists `{ days: localDays, autoGeneration: next }` via `useUpdateAdminScheduleSettingsMutation` with a pre-update snapshot + rollback (mirrors `handleSaveDay`); Arabic success toast + error toast via `arabicServerError`.
  - **`horizonDays` has no UI knob — always sent as 14** (constant `HORIZON_DAYS` in the card).

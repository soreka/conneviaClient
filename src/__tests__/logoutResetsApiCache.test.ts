// src/__tests__/logoutResetsApiCache.test.ts
//
// C-AUTH-03 / C-STATE-01 (pre-ship audit 2026-06-03)
// ---------------------------------------------------------------------------
// INTENDED BEHAVIOR (pin):
//   Dispatching `logout` (from `src/features/auth/authSlice.ts`) MUST also
//   clear the RTK Query cache that lives at `state.api` (the slice produced
//   by `apiSlice.reducer` under reducerPath `'api'`).
//
//   The fix may be implemented EITHER as:
//     (a) `apiSlice.util.resetApiState()` co-dispatched from every logout
//         site (or, better, from a `logoutEverywhere` thunk), OR
//     (b) A root-reducer reset in `src/app/store.ts` that, on action type
//         `'auth/logout'`, drops the `api` slice back to its initial state
//         (`combineReducers` wrapper pattern — recommended by the audit).
//
//   The OBSERVABLE contract this test pins is identity-free: after
//   dispatch(logout()), the `state.api.queries` map must be empty (no
//   cached query results survive). The shape of the rest of the api slice
//   may evolve; we only assert the queries map is empty.
//
//   Today the cache survives logout, so previously-cached `getMe` PII
//   (full name, email, phone, age, weight, health status) and admin
//   query data persists in memory and can be served to the NEXT user
//   on a shared device before background refetch finishes.
//
// SAFETY:
//   - expo-secure-store and expo-auth-session are mocked at module scope.
//   - This test does NOT issue any real network requests; it seeds the
//     RTK Query cache directly via `apiSlice.util.upsertQueryData`, which
//     is the supported public API for hydrating the cache from test code.

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../config/env', () => ({
  ENV: {
    AUTH0_CLIENT_ID: 'test-client-id',
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://test.api',
    API_URL: 'http://test.local',
  },
}));

jest.mock('expo-auth-session', () => ({
  refreshAsync: jest.fn(),
}));

// react-native-reanimated isn't pulled in by apiSlice/authSlice, but keep
// the import surface narrow so the test process stays light.

import { configureStore } from '@reduxjs/toolkit';
import authReducer, { logout } from '../features/auth/authSlice';
import { apiSlice } from '../features/api/apiSlice';

// Build a store with exactly the production wiring (auth slice + api
// reducer + api middleware). When the implementer applies the root-reducer
// reset pattern from option (b), they will do it inside `src/app/store.ts`;
// we read from THAT module so the test exercises the real production
// store factory rather than a hand-rolled mock.
import { store as productionStore } from '../app/store';

// RTK Query schedules a `keepUnusedDataFor` cleanup timer (60s by default)
// per cached query. Without fake timers Jest keeps the process alive past
// the test run waiting on those timers, which manifests as "Jest did not
// exit one second after the test run has completed" + "ReferenceError: ...
// Jest environment after it has been torn down". Fake timers + a final
// `clearAllTimers` keeps the process clean and parallel-test-safe.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('C-AUTH-03 / C-STATE-01 — logout resets the RTK Query cache', () => {
  // Helper: seed a query result into the cache via the supported util.
  // We use `getMe` because it carries the most-sensitive PII and is the
  // exact endpoint the audit flagged as leaking across users.
  async function seedGetMeCache() {
    await productionStore.dispatch(
      apiSlice.util.upsertQueryData('getMe', undefined, {
        ok: true,
        user: {
          id: 'user-A',
          auth0Id: 'auth0|userA',
          email: 'user-a@example.test',
          firstName: 'User',
          lastName: 'A',
          fullName: 'User A',
          phone: '+972500000000',
          health: { age: 30, weight: 60, healthStatus: 'ok' },
          role: 'customer',
          profileCompleted: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      })
    );
  }

  function getApiQueriesMap(state: any): Record<string, unknown> {
    return state?.api?.queries ?? {};
  }

  // Baseline (must remain green): seeding the cache produces a non-empty
  // `state.api.queries` map. This anchors the failing assertion below so
  // we know any failure is about logout NOT clearing the cache, not about
  // upsertQueryData being a no-op.
  test('baseline: seeding the api cache produces a non-empty queries map', async () => {
    await seedGetMeCache();
    const queries = getApiQueriesMap(productionStore.getState());
    expect(Object.keys(queries).length).toBeGreaterThan(0);
  });

  // Intended: dispatch(logout()) must leave `state.api.queries` empty.
  // Today the auth slice resets but the api slice retains all cached data
  // (no resetApiState anywhere, no root-reducer interceptor for
  // 'auth/logout' in src/app/store.ts).
  test(
    'C-AUTH-03/C-STATE-01: logout clears the RTK Query cache so no stale PII survives for the next user',
    async () => {
      // Use a FRESH store built from the same production wiring so this
      // test does not depend on cache state left behind by sibling tests
      // (the imported `productionStore` is a module singleton). Once the
      // root-reducer fix lands in `src/app/store.ts`, that fix will apply
      // to the production singleton too; we just keep this test
      // isolation-friendly. The implementer can also pick the
      // co-dispatched `apiSlice.util.resetApiState()` route — either
      // satisfies the assertion below.
      const isolatedStore = configureStore({
        reducer: {
          auth: authReducer,
          [apiSlice.reducerPath]: apiSlice.reducer,
        },
        middleware: (gdm) => gdm().concat(apiSlice.middleware),
      });

      await isolatedStore.dispatch(
        apiSlice.util.upsertQueryData('getMe', undefined, {
          ok: true,
          user: {
            id: 'user-A',
            auth0Id: 'auth0|userA',
            email: 'user-a@example.test',
            firstName: 'User',
            lastName: 'A',
            fullName: 'User A',
            phone: '+972500000000',
            health: { age: 30, weight: 60, healthStatus: 'ok' },
            role: 'customer',
            profileCompleted: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        })
      );

      // Sanity: cache is non-empty before logout.
      const beforeLogout = getApiQueriesMap(isolatedStore.getState());
      expect(Object.keys(beforeLogout).length).toBeGreaterThan(0);

      // Act: dispatch the user-initiated logout that every reachable
      // teardown calls. The intended fix routes this action through
      // either a root-reducer reset OR a logoutThunk that ALSO dispatches
      // `apiSlice.util.resetApiState()`. We do NOT co-dispatch
      // resetApiState here on purpose — the test fails today precisely
      // because the production wiring does not.
      isolatedStore.dispatch(logout());

      // Assert: the api cache is now empty. Today this fails because
      // neither the authSlice reducer nor src/app/store.ts intercepts
      // 'auth/logout' to wipe the api slice.
      const afterLogout = getApiQueriesMap(isolatedStore.getState());
      expect(Object.keys(afterLogout)).toEqual([]);
    }
  );
});

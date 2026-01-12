import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

export function resetToLogin(): void {
  if (__DEV__) {
    console.log('==============================');
    console.log('[Nav] resetToLogin CALLED');
    console.log('[Nav] isReady =', navigationRef.isReady());
    console.log('[Nav] currentRoute =', navigationRef.getCurrentRoute()?.name);
    console.log('==============================');
  }

  if (!navigationRef.isReady()) {
    if (__DEV__) {
      console.log('[Nav] EXIT – not ready, reset SKIPPED');
    }
    return;
  }

  const currentRouteName = navigationRef.getCurrentRoute()?.name;

  if (__DEV__) {
    console.log('[Nav] DISPATCHING resetRoot → Login from', currentRouteName);
  }

  navigationRef.resetRoot({
    index: 0,
    routes: [{ name: 'Login' }],
  });

  if (__DEV__) {
    console.log('[Nav] resetRoot DISPATCHED');
  }
}

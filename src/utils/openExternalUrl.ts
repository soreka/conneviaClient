// C-STORE-03: shared helper for opening external (legal/contact) URLs.
//
// Calls Linking.openURL synchronously so callers can rely on the call being
// observable immediately after the press handler returns (mirrors the
// existing handleCallStudio / handleWhatsAppStudio pattern in ProfileScreen).
// Failures are caught and surfaced via Toast in release, dev-logged otherwise.
//
// We intentionally skip `Linking.canOpenURL` for https/http URLs — RN's
// default app on iOS/Android always handles https, and `canOpenURL` adds
// an async hop that breaks synchronous-assert test patterns without
// improving real-world behaviour.

import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';

export const openExternalUrl = (url: string): void => {
  void Linking.openURL(url).catch((err: unknown) => {
    if (__DEV__) console.log('[openExternalUrl] failed', url, err);
    Toast.show({
      type: 'error',
      text1: 'تعذّر فتح الرابط',
      position: 'bottom',
    });
  });
};

// src/screens/Subscription/components/__tests__/ContactCard.test.tsx
//
// Regression guards for the dead WhatsApp button on the Subscription screen.
//
// The bug: handleWhatsAppPress called Linking.openURL('whatsapp://send?phone=…')
// — a raw custom scheme with no .catch(). On a device without WhatsApp installed
// (the normal case for an Apple App Review device) the button visibly does
// nothing and the rejected promise surfaces as an unhandled rejection. That is
// an Apple 2.1 rejection risk.
//
// The fix routes both contact buttons through the canonical openExternalUrl
// helper and uses the https://wa.me/<digits> form, which resolves on every
// device (WhatsApp app when installed, WhatsApp Web otherwise) and needs no
// LSApplicationQueriesSchemes entry.

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));

// Declare the `url` param explicitly: a bare `jest.fn(() => …)` types
// `mock.calls` as the empty tuple `[]`, so `calls[0][0]` fails typecheck (TS2493).
const mockOpenURL = jest.fn((_url: string) => Promise.resolve());
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN = require('react-native');
RN.Linking.openURL = mockOpenURL;

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { ContactCard } from '../ContactCard';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ContactCard — contact buttons', () => {
  beforeEach(() => {
    mockOpenURL.mockClear();
    mockOpenURL.mockImplementation(() => Promise.resolve());
    (Toast.show as jest.Mock).mockClear();
  });

  it('opens WhatsApp via an https wa.me URL, not the whatsapp:// custom scheme', () => {
    const { getByText } = render(<ContactCard whatsappNumber="+972549222841" />);

    fireEvent.press(getByText('واتساب'));

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    const url = mockOpenURL.mock.calls[0][0] as unknown as string;

    expect(url).toBe('https://wa.me/972549222841');
    expect(url.startsWith('https://')).toBe(true);
    expect(url).not.toContain('whatsapp://');
  });

  it('strips every non-digit from the number, not just the leading +', () => {
    const { getByText } = render(<ContactCard whatsappNumber="+972 (54) 922-2841" />);

    fireEvent.press(getByText('واتساب'));

    expect(mockOpenURL).toHaveBeenCalledWith('https://wa.me/972549222841');
  });

  it('dials via a tel: URL', () => {
    const { getByText } = render(<ContactCard phoneNumber="+972549222841" />);

    fireEvent.press(getByText('اتصال'));

    expect(mockOpenURL).toHaveBeenCalledWith('tel:+972549222841');
  });

  it('surfaces an Arabic toast instead of an unhandled rejection when the link cannot open', async () => {
    mockOpenURL.mockImplementation(() => Promise.reject(new Error('no handler')));

    const { getByText } = render(<ContactCard />);

    // Must not throw synchronously — the helper owns the rejection.
    expect(() => fireEvent.press(getByText('واتساب'))).not.toThrow();

    await flush();

    expect(Toast.show).toHaveBeenCalledTimes(1);
    expect((Toast.show as jest.Mock).mock.calls[0][0]).toMatchObject({
      type: 'error',
      text1: 'تعذّر فتح الرابط',
    });
  });
});

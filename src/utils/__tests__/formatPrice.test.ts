// src/utils/__tests__/formatPrice.test.ts
// Subscription price formatters.

import { formatAgorotToNis, agorotToNis } from '../formatPrice';

describe('agorotToNis', () => {
  test('250 NIS = 25000 agorot', () => {
    expect(agorotToNis(25000)).toBe(250);
  });

  test('450 NIS = 45000 agorot', () => {
    expect(agorotToNis(45000)).toBe(450);
  });

  test('zero', () => {
    expect(agorotToNis(0)).toBe(0);
  });

  test('rounds half-up to nearest NIS', () => {
    expect(agorotToNis(25050)).toBe(251);
    expect(agorotToNis(25049)).toBe(250);
  });
});

describe('formatAgorotToNis', () => {
  test('appends shekel symbol', () => {
    expect(formatAgorotToNis(25000)).toBe('250 ₪');
    expect(formatAgorotToNis(45000)).toBe('450 ₪');
  });

  test('zero produces "0 ₪"', () => {
    expect(formatAgorotToNis(0)).toBe('0 ₪');
  });
});

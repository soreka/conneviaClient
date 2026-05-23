// src/lib/__tests__/utils.test.ts
// Smoke test for the cn() class-merge utility.

import { cn } from '../utils';

describe('cn', () => {
  test('concatenates two simple classes', () => {
    expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
  });

  test('drops falsy values', () => {
    expect(cn('px-2', false && 'hidden', null, undefined, '')).toBe('px-2');
  });

  test('tailwind-merge resolves conflicting utilities', () => {
    // The later px-4 should win.
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  test('flattens arrays via clsx', () => {
    expect(cn(['px-2', 'py-3'])).toBe('px-2 py-3');
  });
});

// src/screens/Schedule/__tests__/SessionCard.pastSession.test.tsx
//
// PAST-SESSION-UI — regression guards for the customer schedule SessionCard.
// ---------------------------------------------------------------------------
//
// Bug (Ahmed, 2026-08-26): the customer Schedule tab rendered sessions that
// had already started as normal reservable cards — tappable, with a live
// "احجزي الآن" button — and the booking attempt only failed at the confirm
// step with a GENERIC error (the server's SESSION_IN_PAST rejection was not
// mapped). The admin screen already renders past sessions as ended/view-only;
// the customer card now does the same:
//
//   - badge shows the past label ("انتهت الحصة") instead of متاح/ممتلئ
//   - the card press is disabled (onPress never fires)
//   - the book button is not rendered (onBookPress unreachable)
//
// A FUTURE session keeps the exact pre-change behavior (متاح badge, book
// button, working presses) — pinned here so the past-guard can't over-reach.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SessionCard } from '../SessionCard';

const HOUR_MS = 60 * 60 * 1000;

function makeSession(startsAt: Date) {
  return {
    id: 'sess-1',
    title: 'بيلاتس رفورمر',
    startsAt: startsAt.toISOString(),
    durationMin: 60,
    capacity: 4,
    bookedCount: 1,
    availableSeats: 3,
    instructorName: 'المدربة',
    status: 'scheduled',
  };
}

describe('PAST-SESSION-UI — customer schedule SessionCard', () => {
  test('a session that already started renders the ended badge, no book button, and a dead card press', () => {
    const onPress = jest.fn();
    const onBookPress = jest.fn();
    const session = makeSession(new Date(Date.now() - 2 * HOUR_MS));

    render(
      <SessionCard session={session} onPress={onPress} onBookPress={onBookPress} />
    );

    // Ended badge shown; the reservable-state badges are not.
    expect(screen.getByText('انتهت الحصة')).toBeTruthy();
    expect(screen.queryByText('متاح')).toBeNull();
    expect(screen.queryByText('ممتلئ')).toBeNull();

    // No book button at all.
    expect(screen.queryByText('احجزي الآن')).toBeNull();

    // Card press is disabled — navigation into the wizard can't start.
    fireEvent.press(screen.getByText('بيلاتس رفورمر'));
    expect(onPress).not.toHaveBeenCalled();
    expect(onBookPress).not.toHaveBeenCalled();
  });

  test('a FUTURE session keeps the normal reservable card: متاح badge, book button, working presses', () => {
    const onPress = jest.fn();
    const onBookPress = jest.fn();
    const session = makeSession(new Date(Date.now() + 2 * HOUR_MS));

    render(
      <SessionCard session={session} onPress={onPress} onBookPress={onBookPress} />
    );

    expect(screen.getByText('متاح')).toBeTruthy();
    expect(screen.queryByText('انتهت الحصة')).toBeNull();

    const bookButton = screen.getByText('احجزي الآن');
    fireEvent.press(bookButton);
    expect(onBookPress).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('بيلاتس رفورمر'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('a FULL future session still shows ممتلئ (the past-guard does not change full-session rendering)', () => {
    const session = {
      ...makeSession(new Date(Date.now() + 2 * HOUR_MS)),
      bookedCount: 4,
      availableSeats: 0,
    };

    render(
      <SessionCard session={session} onPress={jest.fn()} onBookPress={jest.fn()} />
    );

    expect(screen.getByText('ممتلئ')).toBeTruthy();
    expect(screen.queryByText('احجزي الآن')).toBeNull();
  });
});

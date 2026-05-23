// src/mappers/__tests__/scheduleMappers.test.ts
// Tests for the API -> domain mapper layer. The mapper is the type boundary
// and the place where review findings 2.3, 2.4, 2.5, and 2.6 surface.

import {
  dayIndexToWeekdayId,
  weekdayIdToDayIndex,
  getWeekdayFromISO,
  formatTimeTo24h,
  calculateEndTime,
  normalizeTimeOrder,
  inferSessionType,
  clampOccupiedCount,
  mapApiToSessionCore,
  mapApiToBookingDetails,
  mapApiToAdminSessionDetails,
  mapApiSessionsToCore,
} from '../scheduleMappers';

describe('dayIndexToWeekdayId / weekdayIdToDayIndex', () => {
  test('0 maps to sunday and round-trips', () => {
    expect(dayIndexToWeekdayId(0)).toBe('sunday');
    expect(weekdayIdToDayIndex('sunday')).toBe(0);
  });

  test('6 maps to saturday and round-trips', () => {
    expect(dayIndexToWeekdayId(6)).toBe('saturday');
    expect(weekdayIdToDayIndex('saturday')).toBe(6);
  });

  test('handles negative day index by wrapping', () => {
    expect(dayIndexToWeekdayId(-1)).toBe('saturday');
    expect(dayIndexToWeekdayId(-7)).toBe('sunday');
  });

  test('handles overflow day index by wrapping', () => {
    expect(dayIndexToWeekdayId(7)).toBe('sunday');
    expect(dayIndexToWeekdayId(13)).toBe('saturday');
  });
});

describe('getWeekdayFromISO', () => {
  test('returns weekday derived from local Date for an ISO string', () => {
    // We can't assert an absolute weekday without timezone control,
    // but we can assert it returns one of the seven weekday ids.
    const id = getWeekdayFromISO('2025-12-21T07:00:00.000Z');
    expect([
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]).toContain(id);
  });
});

describe('formatTimeTo24h', () => {
  test('formats a Date object', () => {
    const d = new Date();
    d.setHours(9, 5, 0, 0);
    expect(formatTimeTo24h(d)).toBe('09:05');
  });

  test('passes through "HH:mm" strings', () => {
    expect(formatTimeTo24h('07:30')).toBe('07:30');
  });

  test('extracts time from a hh:mm pattern in any string', () => {
    // The regex requires 2-digit minutes, so "8:05" matches and pads hours.
    expect(formatTimeTo24h('garbage 8:05 trailing')).toBe('08:05');
  });

  test('returns "00:00" fallback for entirely unparseable input', () => {
    // Use a string with no digits to defeat the "extract H:M" regex.
    expect(formatTimeTo24h('not-a-time')).toBe('00:00');
  });
});

describe('calculateEndTime', () => {
  test('adds duration in minutes to start time', () => {
    // Use a local-time anchor so the test does not depend on TZ.
    const start = new Date(2025, 0, 1, 9, 0, 0).toISOString();
    expect(calculateEndTime(start, 60)).toBe('10:00');
  });

  test('handles minutes that wrap the hour', () => {
    const start = new Date(2025, 0, 1, 9, 45, 0).toISOString();
    expect(calculateEndTime(start, 30)).toBe('10:15');
  });
});

describe('normalizeTimeOrder', () => {
  test('keeps natural order intact', () => {
    expect(normalizeTimeOrder('09:00', '10:00')).toEqual({
      startTime: '09:00',
      endTime: '10:00',
      wasReversed: false,
    });
  });

  test('swaps when end <= start (current buggy behavior)', () => {
    expect(normalizeTimeOrder('10:00', '09:00')).toEqual({
      startTime: '09:00',
      endTime: '10:00',
      wasReversed: true,
    });
  });

  // CLIENT-2.5: A 23:00 -> 00:30 session is a legitimate next-day crossover,
  // not a reversed-order error. The current implementation silently swaps
  // it to 00:30 -> 23:00. The intended behavior is to preserve the original
  // order (next-day semantics) or otherwise treat it as a crossover.
  test.failing(
    'CLIENT-2.5: cross-midnight session (23:00 -> 00:30) is preserved, not swapped',
    () => {
      const result = normalizeTimeOrder('23:00', '00:30');
      // Either flag it as crossover (preferred) or at least don't reverse.
      expect(result.startTime).toBe('23:00');
      expect(result.endTime).toBe('00:30');
    }
  );
});

describe('inferSessionType', () => {
  test('direct match in SESSION_TYPE_FROM_ARABIC table', () => {
    expect(inferSessionType('بيلاتس أجهزة')).toBe('pilates_reformer');
    expect(inferSessionType('بيلاتس مات')).toBe('pilates_mat');
    expect(inferSessionType('يوغا صباحية')).toBe('yoga');
    expect(inferSessionType('تمارين القوة')).toBe('strength');
  });

  test('partial-match yoga keyword', () => {
    expect(inferSessionType('يوغا مسائية للمبتدئين')).toBe('yoga');
  });

  test('partial-match strength keyword', () => {
    expect(inferSessionType('تمارين القوة المتقدمة')).toBe('strength');
  });

  test('returns "other" when nothing matches', () => {
    expect(inferSessionType('zumba session')).toBe('other');
  });
});

describe('clampOccupiedCount', () => {
  test('returns unchanged when within range', () => {
    expect(clampOccupiedCount(3, 6)).toEqual({
      occupiedCount: 3,
      wasClamped: false,
    });
  });

  test('clamps when occupied exceeds capacity', () => {
    expect(clampOccupiedCount(10, 6)).toEqual({
      occupiedCount: 6,
      wasClamped: true,
    });
  });

  test('clamps negative values to zero', () => {
    expect(clampOccupiedCount(-1, 6)).toEqual({
      occupiedCount: 0,
      wasClamped: true,
    });
  });
});

describe('mapApiToSessionCore - happy path', () => {
  test('maps the documented consumer API shape', () => {
    const api = {
      id: 'session-1',
      title: 'بيلاتس أجهزة',
      startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
      durationMin: 60,
      capacity: 6,
      bookedCount: 2,
      availableSeats: 4,
      instructorName: 'Emma Davis',
      locationName: 'Main Hall',
      status: 'scheduled',
    };

    const result = mapApiToSessionCore(api);

    expect(result.id).toBe('session-1');
    expect(result.titleAr).toBe('بيلاتس أجهزة');
    expect(result.startTime).toBe('09:00');
    expect(result.endTime).toBe('10:00');
    expect(result.type).toBe('pilates_reformer');
    expect(result.instructorName).toBe('Emma Davis');
    expect(result.locationName).toBe('Main Hall');
    expect(result.capacityTotal).toBe(6);
    expect(result.occupiedCount).toBe(2);
    expect(result.status).toBe('scheduled');
    expect(result.dateISO).toBe(api.startsAt);
  });

  test('falls back to availableSeats for occupiedCount', () => {
    const api = {
      id: 'session-2',
      title: 'yoga',
      startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
      durationMin: 60,
      capacity: 10,
      availableSeats: 4,
      status: 'scheduled',
    };
    const result = mapApiToSessionCore(api);
    expect(result.occupiedCount).toBe(6); // 10 - 4
  });

  test('uses snake_case fallbacks for field names', () => {
    const api = {
      id: 'session-snake',
      title: 'بيلاتس',
      starts_at: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
      duration_min: 30,
      capacity: 4,
      booked_count: 1,
      status: 'scheduled',
    };
    const result = mapApiToSessionCore(api);
    expect(result.id).toBe('session-snake');
    expect(result.startTime).toBe('09:00');
    expect(result.endTime).toBe('09:30');
    expect(result.capacityTotal).toBe(4);
    expect(result.occupiedCount).toBe(1);
  });
});

describe('mapApiToSessionCore - zero-value preservation (CLIENT-2.3)', () => {
  // CLIENT-2.3: capacity of 0 is a legitimate value (closed session) but the
  // mapper currently uses `||` chains that coerce 0 to the next fallback.
  // The bug surfaces clearly when an alternate field name is present: the
  // explicit `capacity: 0` is discarded in favor of `capacityTotal`.
  test.failing(
    'CLIENT-2.3: capacity = 0 is preserved over alternate alias values',
    () => {
      const api = {
        id: 'closed-session',
        title: 'بيلاتس أجهزة',
        startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
        durationMin: 60,
        capacity: 0, // explicit zero from the server
        capacityTotal: 5, // stale legacy field that should be ignored
        bookedCount: 0,
        availableSeats: 0,
        status: 'scheduled',
      };
      const result = mapApiToSessionCore(api);
      expect(result.capacityTotal).toBe(0);
    }
  );

  // CLIENT-2.3: durationMin of 0 should be preserved (instant slot semantics).
  // The current mapper does `api.durationMin || ... || 60` which coerces 0
  // to the 60-min default.
  test.failing(
    'CLIENT-2.3: durationMin = 0 is preserved, not defaulted to 60',
    () => {
      const api = {
        id: 'instant-session',
        title: 'بيلاتس أجهزة',
        startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
        durationMin: 0,
        capacity: 6,
        bookedCount: 0,
        availableSeats: 6,
        status: 'scheduled',
      };
      const result = mapApiToSessionCore(api);
      // A 0-minute duration means end == start.
      expect(result.endTime).toBe(result.startTime);
    }
  );
});

describe('mapApiToBookingDetails', () => {
  test('maps documented admin booking shape', () => {
    const api = {
      id: 'booking-1',
      customerName: 'سارة',
      phone: '0501234567',
      bedNumber: 3,
      attended: true,
      createdAt: '2025-12-21T07:00:00.000Z',
      status: 'active',
    };
    expect(mapApiToBookingDetails(api)).toEqual({
      id: 'booking-1',
      customerName: 'سارة',
      phone: '0501234567',
      bedNumber: 3,
      attended: true,
      createdAt: '2025-12-21T07:00:00.000Z',
      status: 'active',
    });
  });

  test('falls back to user.name and reservationId aliases', () => {
    const api = {
      reservationId: 'res-7',
      user: { name: 'منى', phone: '0507654321' },
      bed_number: 2,
      attendance: false,
      created_at: '2025-12-21T07:00:00.000Z',
      status: 'cancelled',
    };
    const result = mapApiToBookingDetails(api);
    expect(result.id).toBe('res-7');
    expect(result.customerName).toBe('منى');
    expect(result.phone).toBe('0507654321');
    expect(result.bedNumber).toBe(2);
    expect(result.attended).toBe(false);
    expect(result.createdAt).toBe('2025-12-21T07:00:00.000Z');
    expect(result.status).toBe('cancelled');
  });
});

describe('mapApiToAdminSessionDetails', () => {
  test('attaches the bookings array', () => {
    const api = {
      id: 'session-admin-1',
      title: 'بيلاتس أجهزة',
      startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
      durationMin: 60,
      capacity: 6,
      bookedCount: 2,
      availableSeats: 4,
      status: 'scheduled',
      bookings: [
        { id: 'b1', customerName: 'سارة', bedNumber: 1, attended: true },
        { id: 'b2', customerName: 'منى', bedNumber: 2, attended: null },
      ],
    };
    const result = mapApiToAdminSessionDetails(api);
    expect(result.bookings).toHaveLength(2);
    expect(result.bookings[0].customerName).toBe('سارة');
  });

  test('falls back to bookings.length when core.occupiedCount is 0', () => {
    // Documents the *current* behavior: when occupiedCount derived from the
    // session core is 0 but bookings exist, the count gets inflated. The
    // .failing test below asserts the intended behavior.
    const api = {
      id: 'session-admin-2',
      title: 'بيلاتس أجهزة',
      startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
      durationMin: 60,
      capacity: 6,
      // bookedCount and availableSeats absent -> rawOccupied=0
      status: 'scheduled',
      bookings: [{ id: 'b1', customerName: 'سارة' }],
    };
    const result = mapApiToAdminSessionDetails(api);
    expect(result.occupiedCount).toBe(1);
  });

  // CLIENT-2.4: Occupancy override should only fire when the source field
  // is absent. If the server says bookedCount=0 explicitly, an empty or stale
  // bookings array must not silently inflate the count.
  test.failing(
    'CLIENT-2.4: bookings.length only overrides when no occupancy field was provided',
    () => {
      const api = {
        id: 'session-admin-3',
        title: 'بيلاتس أجهزة',
        startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
        durationMin: 60,
        capacity: 6,
        // Server explicitly says zero bookings...
        bookedCount: 0,
        availableSeats: 6,
        status: 'scheduled',
        // ...but a stale bookings array slipped in.
        bookings: [{ id: 'b1', customerName: 'stale-سارة' }],
      };
      const result = mapApiToAdminSessionDetails(api);
      // Intended: trust the explicit field, do not inflate.
      expect(result.occupiedCount).toBe(0);
    }
  );
});

describe('mapApiSessionsToCore', () => {
  test('maps an array of sessions', () => {
    const api = [
      {
        id: 'a',
        title: 'بيلاتس أجهزة',
        startsAt: new Date(2025, 0, 1, 9, 0, 0).toISOString(),
        durationMin: 60,
        capacity: 6,
        bookedCount: 0,
        availableSeats: 6,
        status: 'scheduled',
      },
      {
        id: 'b',
        title: 'يوغا صباحية',
        startsAt: new Date(2025, 0, 1, 10, 0, 0).toISOString(),
        durationMin: 45,
        capacity: 8,
        bookedCount: 1,
        availableSeats: 7,
        status: 'scheduled',
      },
    ];
    const result = mapApiSessionsToCore(api);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
    expect(result[1].type).toBe('yoga');
  });
});

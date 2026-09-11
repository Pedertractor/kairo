import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { zonedDateTimeToUtc } from './app-timezone.js';
import {
  calculateAvailabilitySeconds,
  DAILY_AVAILABILITY_SECONDS,
  type ShiftPeriodInterval,
} from './work-availability.js';

/** 10/07 in the chat examples is 10 July (DD/MM), in America/Sao_Paulo. */
const DAY = '2026-07-10';
const SHIFT_START_MINUTES = 6 * 60 + 15;
const SHIFT_END_MINUTES = 15 * 60 + 3;

function at(hour: number, minute: number, second = 0): Date {
  return zonedDateTimeToUtc(DAY, hour, minute, second);
}

function shiftForDay(
  startMinutes = SHIFT_START_MINUTES,
  endMinutes = SHIFT_END_MINUTES,
): ShiftPeriodInterval[] {
  return [
    {
      startMinutes,
      endMinutes,
      startedAt: at(0, 0),
      endedAt: null,
    },
  ];
}

function occupationPercent(
  loggedSeconds: number,
  availabilitySeconds: number,
): number {
  return availabilitySeconds > 0
    ? Math.round((loggedSeconds / availabilitySeconds) * 100)
    : 0;
}

describe('calculateAvailabilitySeconds — late start and absences', () => {
  it('counts the full shift as available, not only elapsed time', () => {
    const now = at(8, 0);
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS);
  });

  it('counts idle shift time as available when nobody marked an absence', () => {
    const now = at(12, 0);
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );
    const loggedSeconds = Math.floor((now.getTime() - at(9, 15).getTime()) / 1000);

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS);
    assert.equal(loggedSeconds, 2 * 3600 + 45 * 60);
    assert.ok(
      occupationPercent(loggedSeconds, availabilitySeconds) < 50,
      'the idle hours after 06:15 must pull occupation down',
    );
  });

  it('removes marked absence from available time so occupation is not penalized', () => {
    const now = at(12, 0);
    const availabilitySeconds = calculateAvailabilitySeconds(
      [{ startedAt: at(6, 15), endedAt: at(9, 14) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );
    const withoutAbsence = calculateAvailabilitySeconds(
      [],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );

    assert.equal(availabilitySeconds, withoutAbsence - (2 * 3600 + 59 * 60));
  });

  it('uses the clipped absence end when the person starts a time entry early', () => {
    const now = at(12, 0);
    const availabilitySeconds = calculateAvailabilitySeconds(
      [{ startedAt: at(6, 15), endedAt: at(9, 0) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );

    assert.equal(
      availabilitySeconds,
      DAILY_AVAILABILITY_SECONDS - (2 * 3600 + 45 * 60),
    );
  });

  it('does not keep the original 10:00 end after an early return at 09:00', () => {
    const now = at(12, 0);
    const clipped = calculateAvailabilitySeconds(
      [{ startedAt: at(6, 15), endedAt: at(9, 0) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );
    const unclipped = calculateAvailabilitySeconds(
      [{ startedAt: at(6, 15), endedAt: at(10, 0) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );

    assert.ok(
      clipped > unclipped,
      'work from 09:00 to 10:00 must stay in available time after the clip',
    );
  });

  it('caps daily availability at 8h 48min even when the shift is longer', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      at(8, 0),
      shiftForDay(6 * 60, 18 * 60),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS);
  });

  it('uses the actual shift length when it is shorter than 8h 48min', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      at(8, 0),
      shiftForDay(8 * 60, 12 * 60),
    );

    assert.equal(availabilitySeconds, 4 * 3600);
  });
});

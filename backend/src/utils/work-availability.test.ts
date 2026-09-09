import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { zonedDateTimeToUtc } from './app-timezone.js';
import {
  calculateAvailabilitySeconds,
  type ShiftPeriodInterval,
} from './work-availability.js';

/** 10/07 in the chat examples is 10 July (DD/MM), in America/Sao_Paulo. */
const DAY = '2026-07-10';
const SHIFT_START_MINUTES = 6 * 60 + 15;
const SHIFT_END_MINUTES = 15 * 60 + 3;

function at(hour: number, minute: number, second = 0): Date {
  return zonedDateTimeToUtc(DAY, hour, minute, second);
}

function shiftForDay(): ShiftPeriodInterval[] {
  return [
    {
      startMinutes: SHIFT_START_MINUTES,
      endMinutes: SHIFT_END_MINUTES,
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

    assert.equal(availabilitySeconds, 5 * 3600 + 45 * 60);
    assert.equal(loggedSeconds, 2 * 3600 + 45 * 60);
    assert.ok(
      occupationPercent(loggedSeconds, availabilitySeconds) < 50,
      'the three idle hours after 06:15 must pull occupation down',
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
    const loggedSeconds = Math.floor((now.getTime() - at(9, 15).getTime()) / 1000);
    const withoutAbsence = calculateAvailabilitySeconds(
      [],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );

    assert.equal(availabilitySeconds, withoutAbsence - (2 * 3600 + 59 * 60));
    assert.equal(occupationPercent(loggedSeconds, availabilitySeconds), 99);
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
    const loggedSeconds = Math.floor((now.getTime() - at(9, 0).getTime()) / 1000);

    assert.equal(availabilitySeconds, loggedSeconds);
    assert.equal(occupationPercent(loggedSeconds, availabilitySeconds), 100);
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

  it('does not add shift time that has not elapsed yet', () => {
    const now = at(9, 15);
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );

    assert.equal(availabilitySeconds, 3 * 3600);
  });
});

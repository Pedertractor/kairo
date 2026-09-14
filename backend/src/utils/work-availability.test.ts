import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { zonedDateTimeToUtc } from './app-timezone.js';
import {
  allocateAvailabilitySeconds,
  buildTeamAllocationSegments,
  calculateAvailabilitySeconds,
  DAILY_AVAILABILITY_SECONDS,
  getOpenAvailabilityIntervals,
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

describe('team-scoped availability allocation', () => {
  const TEAM_A = 'team-a';
  const TEAM_B = 'team-b';
  const periodStart = at(0, 0);
  const periodEnd = zonedDateTimeToUtc('2026-07-11');

  function openForDay(
    absences: Parameters<typeof getOpenAvailabilityIntervals>[0] = [],
    shifts = shiftForDay(),
  ) {
    return getOpenAvailabilityIntervals(
      absences,
      periodStart,
      periodEnd,
      at(18, 0),
      shifts,
    );
  }

  it('carries the last team from a previous day so morning idle belongs to that team', () => {
    const open = openForDay();
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, TEAM_A, [
      { startedAt: at(13, 0), teamId: TEAM_B },
    ]);

    const forA = allocateAvailabilitySeconds(open, segments, [TEAM_A]);
    const forB = allocateAvailabilitySeconds(open, segments, [TEAM_B]);

    // 06:15–13:00 = 6h 45min; 13:00–15:03 = 2h 03min
    assert.equal(forA, 6 * 3600 + 45 * 60);
    assert.equal(forB, 2 * 3600 + 3 * 60);
    assert.equal(forA + forB, DAILY_AVAILABILITY_SECONDS);
  });

  it('switches ownership at the new entry startedAt', () => {
    const open = openForDay();
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, TEAM_A, [
      { startedAt: at(10, 0), teamId: TEAM_B },
    ]);

    assert.deepEqual(segments, [
      { teamId: TEAM_A, start: periodStart.getTime(), end: at(10, 0).getTime() },
      { teamId: TEAM_B, start: at(10, 0).getTime(), end: periodEnd.getTime() },
    ]);

    const forB = allocateAvailabilitySeconds(open, segments, [TEAM_B]);
    // 10:00–15:03 = 5h 03min
    assert.equal(forB, 5 * 3600 + 3 * 60);
  });

  it('gives zero availability when the person never pointed', () => {
    const open = openForDay();
    const segments = buildTeamAllocationSegments(
      periodStart,
      periodEnd,
      null,
      [],
    );

    assert.equal(segments.length, 0);
    assert.equal(allocateAvailabilitySeconds(open, segments, [TEAM_A]), 0);
    assert.equal(allocateAvailabilitySeconds(open, segments, [TEAM_B]), 0);
  });

  it('keeps full shift for a single-team member with a prior entry', () => {
    const open = openForDay();
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, TEAM_A, [
      { startedAt: at(9, 0), teamId: TEAM_A },
    ]);

    assert.equal(
      allocateAvailabilitySeconds(open, segments, [TEAM_A]),
      DAILY_AVAILABILITY_SECONDS,
    );
    assert.equal(allocateAvailabilitySeconds(open, segments, [TEAM_B]), 0);
  });

  it('assigns first mid-day entry ownership only from that startedAt when there is no carry-over', () => {
    const open = openForDay();
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, null, [
      { startedAt: at(11, 0), teamId: TEAM_A },
    ]);

    // Morning idle is unowned; only 11:00–15:03 belongs to Team A
    assert.equal(
      allocateAvailabilitySeconds(open, segments, [TEAM_A]),
      4 * 3600 + 3 * 60,
    );
  });

  it('removes absence only from the team that owns that window', () => {
    const open = openForDay([{ startedAt: at(6, 15), endedAt: at(9, 0) }]);
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, TEAM_A, [
      { startedAt: at(13, 0), teamId: TEAM_B },
    ]);

    const forA = allocateAvailabilitySeconds(open, segments, [TEAM_A]);
    const forB = allocateAvailabilitySeconds(open, segments, [TEAM_B]);

    // Team A owns 06:15–13:00 minus absence 06:15–09:00 → 09:00–13:00 = 4h
    assert.equal(forA, 4 * 3600);
    // Team B still gets 13:00–15:03
    assert.equal(forB, 2 * 3600 + 3 * 60);
  });

  it('allocates across a multi-day period with one switch', () => {
    const multiStart = at(0, 0);
    const multiEnd = zonedDateTimeToUtc('2026-07-12');
    const open = getOpenAvailabilityIntervals(
      [],
      multiStart,
      multiEnd,
      zonedDateTimeToUtc('2026-07-12', 18, 0),
      [
        {
          startMinutes: SHIFT_START_MINUTES,
          endMinutes: SHIFT_END_MINUTES,
          startedAt: at(0, 0),
          endedAt: null,
        },
      ],
    );
    const switchAt = zonedDateTimeToUtc('2026-07-11', 8, 0);
    const segments = buildTeamAllocationSegments(multiStart, multiEnd, TEAM_A, [
      { startedAt: switchAt, teamId: TEAM_B },
    ]);

    const forA = allocateAvailabilitySeconds(open, segments, [TEAM_A]);
    const forB = allocateAvailabilitySeconds(open, segments, [TEAM_B]);

    // Day 1 full (8h48) for A; day 2 from 08:00–15:03 for B (7h 03min)
    // Day 2 morning 06:15–08:00 still A (1h 45min)
    assert.equal(forA, DAILY_AVAILABILITY_SECONDS + (1 * 3600 + 45 * 60));
    assert.equal(forB, 7 * 3600 + 3 * 60);
    assert.equal(forA + forB, DAILY_AVAILABILITY_SECONDS * 2);
  });

  it('caps long shifts once so total across teams never exceeds 8h 48min', () => {
    const open = openForDay([], shiftForDay(6 * 60, 18 * 60));
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, TEAM_A, [
      { startedAt: at(12, 0), teamId: TEAM_B },
    ]);

    const forA = allocateAvailabilitySeconds(open, segments, [TEAM_A]);
    const forB = allocateAvailabilitySeconds(open, segments, [TEAM_B]);

    assert.equal(forA + forB, DAILY_AVAILABILITY_SECONDS);
    // Cap keeps the first 8h48 of the 12h window (06:00–14:48)
    assert.equal(forA, 6 * 3600); // 06:00–12:00
    assert.equal(forB, 2 * 3600 + 48 * 60); // 12:00–14:48
  });

  it('ignores teams outside the scoped set', () => {
    const open = openForDay();
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, TEAM_A, [
      { startedAt: at(13, 0), teamId: TEAM_B },
    ]);

    assert.equal(
      allocateAvailabilitySeconds(open, segments, new Set([TEAM_A])),
      6 * 3600 + 45 * 60,
    );
    assert.equal(
      allocateAvailabilitySeconds(open, segments, new Set(['team-other'])),
      0,
    );
  });
});

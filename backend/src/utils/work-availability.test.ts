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

  it('discounts a short closed absence instead of refilling the 8h 48min cap', () => {
    const now = at(12, 0);
    const availabilitySeconds = calculateAvailabilitySeconds(
      [{ startedAt: at(8, 0), endedAt: at(8, 15) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      now,
      shiftForDay(),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS - 15 * 60);
  });

  it('discounts a 15min absence on a longer shift instead of backfilling later hours', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [{ startedAt: at(8, 0), endedAt: at(8, 15) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      at(18, 0),
      shiftForDay(6 * 60, 18 * 60),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS - 15 * 60);
  });

  it('discounts a 15min absence when the person has no shift recorded', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [{ startedAt: at(8, 0), endedAt: at(8, 15) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      at(12, 0),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS - 15 * 60);
  });

  it('discounts a same-day afternoon absence when the person has no shift', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [{ startedAt: at(14, 0), endedAt: at(14, 15) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      at(16, 0),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS - 15 * 60);
  });

  it('does not discount an absence that falls after the capped 8h 48min window', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [{ startedAt: at(16, 0), endedAt: at(16, 15) }],
      at(0, 0),
      zonedDateTimeToUtc('2026-07-11'),
      at(18, 0),
      shiftForDay(6 * 60, 18 * 60),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS);
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
    // Thursday 09/07 + Friday 10/07 — two weekdays, no weekend.
    const multiStart = zonedDateTimeToUtc('2026-07-09');
    const multiEnd = zonedDateTimeToUtc('2026-07-11');
    const open = getOpenAvailabilityIntervals(
      [],
      multiStart,
      multiEnd,
      zonedDateTimeToUtc('2026-07-11', 18, 0),
      [
        {
          startMinutes: SHIFT_START_MINUTES,
          endMinutes: SHIFT_END_MINUTES,
          startedAt: zonedDateTimeToUtc('2026-07-09'),
          endedAt: null,
        },
      ],
    );
    const switchAt = zonedDateTimeToUtc('2026-07-10', 8, 0);
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

  it('keeps a 15min hole in team-scoped intervals instead of refilling the cap', () => {
    const open = openForDay([{ startedAt: at(8, 0), endedAt: at(8, 15) }]);
    const segments = buildTeamAllocationSegments(periodStart, periodEnd, TEAM_A, [
      { startedAt: at(9, 0), teamId: TEAM_A },
    ]);

    assert.equal(
      allocateAvailabilitySeconds(open, segments, [TEAM_A]),
      DAILY_AVAILABILITY_SECONDS - 15 * 60,
    );
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

describe('weekends do not count toward availability', () => {
  const weekendShift = (
    startedAt: Date,
  ): ShiftPeriodInterval[] => [
    {
      startMinutes: SHIFT_START_MINUTES,
      endMinutes: SHIFT_END_MINUTES,
      startedAt,
      endedAt: null,
    },
  ];

  it('gives zero availability on Saturday even with a shift', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      zonedDateTimeToUtc('2026-07-11'),
      zonedDateTimeToUtc('2026-07-12'),
      zonedDateTimeToUtc('2026-07-11', 18, 0),
      weekendShift(zonedDateTimeToUtc('2026-07-11')),
    );

    assert.equal(availabilitySeconds, 0);
  });

  it('gives zero availability on Sunday even with a shift', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      zonedDateTimeToUtc('2026-07-12'),
      zonedDateTimeToUtc('2026-07-13'),
      zonedDateTimeToUtc('2026-07-12', 18, 0),
      weekendShift(zonedDateTimeToUtc('2026-07-12')),
    );

    assert.equal(availabilitySeconds, 0);
  });

  it('counts only Friday and Monday across a Fri–Mon span', () => {
    const availabilitySeconds = calculateAvailabilitySeconds(
      [],
      zonedDateTimeToUtc('2026-07-10'),
      zonedDateTimeToUtc('2026-07-14'),
      zonedDateTimeToUtc('2026-07-14', 18, 0),
      weekendShift(zonedDateTimeToUtc('2026-07-10')),
    );

    assert.equal(availabilitySeconds, DAILY_AVAILABILITY_SECONDS * 2);
  });

  it('does not let a Saturday absence reduce weekday availability', () => {
    const withWeekendAbsence = calculateAvailabilitySeconds(
      [
        {
          startedAt: zonedDateTimeToUtc('2026-07-11', 6, 15),
          endedAt: zonedDateTimeToUtc('2026-07-11', 15, 3),
        },
      ],
      zonedDateTimeToUtc('2026-07-10'),
      zonedDateTimeToUtc('2026-07-12'),
      zonedDateTimeToUtc('2026-07-12', 18, 0),
      weekendShift(zonedDateTimeToUtc('2026-07-10')),
    );

    assert.equal(withWeekendAbsence, DAILY_AVAILABILITY_SECONDS);
  });
});


describe('overnight availability and occupation', () => {
  const date = (day: string, hour = 0, minute = 0) => zonedDateTimeToUtc(day, hour, minute);
  const shifts: ShiftPeriodInterval[] = [{
    startMinutes: 1200, endMinutes: 120,
    startedAt: date('2026-06-01'), endedAt: null,
  }];
  const seconds = (start: Date, end: Date, periods = shifts, absences: Parameters<typeof calculateAvailabilitySeconds>[0] = []) =>
    calculateAvailabilitySeconds(absences, start, end, end, periods);

  it('splits Monday into 4h and Tuesday continuation into 2h without duplication', () => {
    const mon = date('2026-07-06'), tue = date('2026-07-07'), end = date('2026-07-07', 2);
    assert.equal(seconds(mon, tue), 4 * 3600);
    assert.equal(seconds(tue, end), 2 * 3600);
    assert.equal(seconds(mon, end), seconds(mon, tue) + seconds(tue, end));
    assert.equal(occupationPercent(6 * 3600, seconds(mon, end)), 100);
    assert.equal(seconds(date('2026-07-06', 23), date('2026-07-07', 1)), 2 * 3600);
  });

  it('caps once before clipping, and never refills capacity removed by an absence', () => {
    const long = [{ ...shifts[0], endMinutes: 600 }];
    const start = date('2026-07-06', 20), midnight = date('2026-07-07'), end = date('2026-07-07', 10);
    const absences = [{ startedAt: date('2026-07-06', 23), endedAt: date('2026-07-07', 1) }];
    assert.equal(seconds(start, end, long), DAILY_AVAILABILITY_SECONDS);
    assert.equal(seconds(midnight, end, long), 4 * 3600 + 48 * 60);
    assert.equal(seconds(start, end, long, absences), DAILY_AVAILABILITY_SECONDS - 2 * 3600);
    assert.equal(seconds(start, midnight, long, absences) + seconds(midnight, end, long, absences),
      seconds(start, end, long, absences));
  });

  it('subtracts overlapping absences across midnight only once, including open absences', () => {
    const start = date('2026-07-06', 20), end = date('2026-07-07', 2);
    const absences = [
      { startedAt: date('2026-07-06', 23), endedAt: date('2026-07-07', 1) },
      { startedAt: date('2026-07-07'), endedAt: date('2026-07-07', 1, 30) },
    ];
    assert.equal(seconds(start, end, shifts, absences), 3.5 * 3600);
    assert.equal(seconds(start, end, shifts, [{ startedAt: date('2026-07-07', 1), endedAt: null }]), 5 * 3600);
  });

  it('includes Friday continuation on Saturday but excludes weekend start days', () => {
    assert.equal(seconds(date('2026-07-10', 20), date('2026-07-11', 2)), 6 * 3600);
    assert.equal(seconds(date('2026-07-11'), date('2026-07-12')), 2 * 3600);
    assert.equal(seconds(date('2026-07-12'), date('2026-07-13')), 0);
    assert.equal(seconds(date('2026-07-13'), date('2026-07-13', 2)), 0);
  });

  it('includes continuation across month and year boundaries', () => {
    for (const [start, end] of [['2026-06-30', '2026-07-01'], ['2026-12-31', '2027-01-01']]) {
      assert.equal(seconds(date(start, 20), date(end, 2)), 6 * 3600);
      assert.equal(seconds(date(end), date(end, 2)), 2 * 3600);
    }
  });

  it('preserves the original occurrence when the shift is edited after midnight', () => {
    const changed = date('2026-07-07', 1);
    const history = [
      { ...shifts[0], endedAt: changed },
      { startMinutes: 480, endMinutes: 720, startedAt: changed, endedAt: null },
    ];
    assert.equal(seconds(date('2026-07-06', 20), date('2026-07-07', 2), history), 6 * 3600);
    assert.equal(seconds(date('2026-07-07'), date('2026-07-08'), history), 6 * 3600);
  });

  it('does not create an occurrence before an overnight schedule became effective', () => {
    const history = [{ ...shifts[0], startedAt: date('2026-07-06', 21) }];
    assert.equal(seconds(date('2026-07-06', 20), date('2026-07-07', 2), history), 0);
  });

  it('allocates capacity to the owning team on each side of midnight', () => {
    const start = date('2026-07-06', 20), end = date('2026-07-07', 2);
    const open = getOpenAvailabilityIntervals([], start, end, end, shifts);
    const segments = buildTeamAllocationSegments(start, end, 'a', [
      { startedAt: date('2026-07-07', 1), teamId: 'b' },
    ]);
    assert.equal(allocateAvailabilitySeconds(open, segments, ['a']), 5 * 3600);
    assert.equal(allocateAvailabilitySeconds(open, segments, ['b']), 3600);
    assert.equal(allocateAvailabilitySeconds(open, segments, ['a', 'b']), seconds(start, end));
  });
});


describe('overnight transition boundaries', () => {
  const date = (day: string, hour = 0) => zonedDateTimeToUtc(day, hour);
  it('counts overlapping old/new occurrences only once', () => {
    const changed = date('2026-07-07');
    const periods = [
      { startMinutes: 1200, endMinutes: 120, startedAt: date('2026-07-06'), endedAt: changed },
      { startMinutes: 60, endMinutes: 240, startedAt: changed, endedAt: null },
    ];
    const start = date('2026-07-06', 20), end = date('2026-07-07', 4);
    assert.equal(calculateAvailabilitySeconds([], start, end, end, periods), 8 * 3600);
  });
  it('ends exactly at midnight without adding next-day capacity', () => {
    const periods = [{ startMinutes: 1200, endMinutes: 0, startedAt: date('2026-07-06'), endedAt: null }];
    const start = date('2026-07-06', 20), midnight = date('2026-07-07'), end = date('2026-07-07', 2);
    assert.equal(calculateAvailabilitySeconds([], start, midnight, end, periods), 4 * 3600);
    assert.equal(calculateAvailabilitySeconds([], midnight, end, end, periods), 0);
  });
});

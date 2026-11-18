import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { zonedDateTimeToUtc } from './app-timezone.js';
import {
  calculateAvailabilitySeconds,
  DAILY_AVAILABILITY_SECONDS,
  LUNCH_BREAK_SECONDS,
  type ShiftPeriodInterval,
} from './work-availability.js';
import { WorkDayCalendar } from './work-day.js';

const at = (day: string, hour = 0, minute = 0) => zonedDateTimeToUtc(day, hour, minute);
const overnight: ShiftPeriodInterval[] = [{
  startMinutes: 18 * 60, endMinutes: 2 * 60,
  startedAt: at('2026-06-01'), endedAt: null,
}];

describe('WorkDayCalendar', () => {
  it('keeps calendar days without an overnight shift', () => {
    const daytime = new WorkDayCalendar([{ ...overnight[0], startMinutes: 480, endMinutes: 1020 }]);
    assert.equal(daytime.isShifted, false);
    assert.deepEqual(daytime.dayBounds('2026-07-06'), {
      start: at('2026-07-06').getTime(),
      end: at('2026-07-07').getTime(),
    });
    assert.equal(new WorkDayCalendar().dayStartMs('2026-07-06'), at('2026-07-06').getTime());
  });

  it('cuts an 18:00-02:00 work day in the middle of the off-duty gap', () => {
    const calendar = new WorkDayCalendar(overnight);
    assert.deepEqual(calendar.dayBounds('2026-07-06'), {
      start: at('2026-07-06', 10).getTime(),
      end: at('2026-07-07', 10).getTime(),
    });
    assert.equal(calendar.dateKeyOf(at('2026-07-07', 1, 59).getTime()), '2026-07-06');
    assert.equal(calendar.dateKeyOf(at('2026-07-07', 10).getTime()), '2026-07-07');
  });

  it('keeps Sunday night on Sunday and Friday night on Friday', () => {
    const calendar = new WorkDayCalendar(overnight);
    assert.equal(calendar.dateKeyOf(at('2026-07-13', 1).getTime()), '2026-07-12');
    assert.equal(calendar.dateKeyOf(at('2026-07-11', 1).getTime()), '2026-07-10');
  });

  it('keeps the schedule an occurrence started with when it changes', () => {
    const changed = at('2026-07-07', 1);
    const calendar = new WorkDayCalendar([
      { ...overnight[0], endedAt: changed },
      { startMinutes: 480, endMinutes: 1020, startedAt: changed, endedAt: null },
    ]);
    assert.equal(calendar.dayStartMs('2026-07-07'), at('2026-07-07', 10).getTime());
    assert.equal(calendar.dayStartMs('2026-07-08'), at('2026-07-08').getTime());
  });

  it('gives Monday the same availability as Tuesday for overnight shifts', () => {
    const calendar = new WorkDayCalendar(overnight);
    const availability = (day: string) => {
      const { periodStart, periodEnd } = calendar.periodBounds(day, day);
      return calculateAvailabilitySeconds(
        [], at(day), at(day === '2026-07-06' ? '2026-07-07' : '2026-07-08'),
        at('2026-08-01'), overnight, { start: periodStart.getTime(), end: periodEnd.getTime() },
      );
    };
    const expected = 8 * 3600 - LUNCH_BREAK_SECONDS;
    assert.ok(expected < DAILY_AVAILABILITY_SECONDS);
    assert.equal(availability('2026-07-06'), expected);
    assert.equal(availability('2026-07-07'), expected);
  });
});

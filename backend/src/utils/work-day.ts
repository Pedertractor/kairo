import {
  formatDateKey,
  parseDayBounds,
  shiftDateKey,
} from './app-timezone.js';
import {
  resolveShiftForDay,
  shiftBoundaryMs,
  sortShifts,
  type ShiftPeriodInterval,
  type TimeInterval,
} from './work-availability.js';

/**
 * Work days ("dia da jornada"). Time worked on an overnight shift belongs to
 * the day the shift started, so a collaborator on an overnight schedule does
 * not have their day cut at midnight. Their day boundary is the middle of the
 * off-duty gap of the previous day's shift: with 18:00-02:00, Monday's work
 * day runs from Monday 10:00 to Tuesday 10:00. Everyone else keeps calendar
 * days. Like availability, the previous day's schedule decides the boundary,
 * so an overnight occurrence keeps the schedule it started with.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Widens a calendar range by one day on each side for time-entry queries. */
export function widenForWorkDays(
  periodStart: Date,
  periodEnd: Date,
): { queryStart: Date; queryEnd: Date } {
  return {
    queryStart: parseDayBounds(shiftDateKey(formatDateKey(periodStart), -1)).dayStart,
    queryEnd: new Date(periodEnd.getTime() + DAY_MS),
  };
}

export class WorkDayCalendar {
  private readonly shifts: ShiftPeriodInterval[];
  private readonly hasOvernight: boolean;
  private readonly startCache = new Map<string, number>();

  constructor(shifts: ShiftPeriodInterval[] = []) {
    this.shifts = sortShifts(shifts);
    this.hasOvernight = this.shifts.some(
      (shift) => shift.endMinutes < shift.startMinutes,
    );
  }

  /** True when this calendar can differ from plain calendar days. */
  get isShifted(): boolean {
    return this.hasOvernight;
  }

  /** Instant at which the work day `dateKey` starts. */
  dayStartMs(dateKey: string): number {
    const midnight = parseDayBounds(dateKey).dayStart.getTime();

    if (!this.hasOvernight) {
      return midnight;
    }

    const cached = this.startCache.get(dateKey);

    if (cached !== undefined) {
      return cached;
    }

    const previousKey = shiftDateKey(dateKey, -1);
    const previous = parseDayBounds(previousKey);
    const shift = resolveShiftForDay(
      this.shifts,
      previous.dayStart.getTime(),
      previous.dayEnd.getTime(),
      previousKey,
    );
    let start = midnight;

    if (shift && shift.endMinutes < shift.startMinutes) {
      const cutoffMinutes =
        shift.endMinutes +
        Math.floor((shift.startMinutes - shift.endMinutes) / 2);
      start = shiftBoundaryMs(dateKey, cutoffMinutes);
    }

    this.startCache.set(dateKey, start);

    return start;
  }

  dayBounds(dateKey: string): TimeInterval {
    return {
      start: this.dayStartMs(dateKey),
      end: this.dayStartMs(shiftDateKey(dateKey, 1)),
    };
  }

  /** Work-day bounds covering `startDate` through `endDate`, inclusive. */
  periodBounds(startDate: string, endDate: string): {
    periodStart: Date;
    periodEnd: Date;
  } {
    return {
      periodStart: new Date(this.dayStartMs(startDate)),
      periodEnd: new Date(this.dayStartMs(shiftDateKey(endDate, 1))),
    };
  }

  /** Work day an instant belongs to. */
  dateKeyOf(instantMs: number): string {
    const calendarKey = formatDateKey(new Date(instantMs));

    return instantMs < this.dayStartMs(calendarKey)
      ? shiftDateKey(calendarKey, -1)
      : calendarKey;
  }
}

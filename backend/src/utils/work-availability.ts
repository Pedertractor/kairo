import { formatDateKey, parseDayBounds, shiftDateKey } from './app-timezone.js';

export const DAILY_AVAILABILITY_SECONDS = 8 * 60 * 60 + 48 * 60;

export interface AbsenceInterval {
  startedAt: Date;
  endedAt: Date | null;
}

export interface ShiftPeriodInterval {
  startMinutes: number;
  endMinutes: number;
  startedAt: Date;
  endedAt: Date | null;
}

interface DaySlice {
  start: number;
  end: number;
  dateKey: string;
}

const MAX_CACHED_PERIODS = 256;

const periodSliceCache = new Map<string, DaySlice[]>();

/**
 * Splits a period into per-day slices in app timezone. The result only depends
 * on the period bounds, so it is memoized and shared across every user of the
 * same request instead of being recomputed per user.
 */
function getPeriodDaySlices(
  periodStart: Date,
  periodEndExclusive: Date,
): DaySlice[] {
  const periodStartMs = periodStart.getTime();
  const periodEndMs = periodEndExclusive.getTime();
  const cacheKey = `${periodStartMs}:${periodEndMs}`;
  const cached = periodSliceCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const slices: DaySlice[] = [];
  let dateKey = formatDateKey(periodStart);

  while (true) {
    const { dayStart, dayEnd } = parseDayBounds(dateKey);
    const sliceStart = Math.max(dayStart.getTime(), periodStartMs);
    const sliceEnd = Math.min(dayEnd.getTime(), periodEndMs);

    if (sliceStart >= periodEndMs) {
      break;
    }

    slices.push({ start: sliceStart, end: sliceEnd, dateKey });

    if (dayEnd.getTime() >= periodEndMs) {
      break;
    }

    dateKey = shiftDateKey(dateKey, 1);
  }

  if (periodSliceCache.size >= MAX_CACHED_PERIODS) {
    periodSliceCache.clear();
  }

  periodSliceCache.set(cacheKey, slices);

  return slices;
}

/**
 * Absent seconds inside a single day slice, merging overlapping absences.
 * Expects `absences` sorted by `startedAt` so the merge is a single pass.
 */
function absentSecondsInSlice(
  absences: AbsenceInterval[],
  slice: DaySlice,
  nowMs: number,
): number {
  let totalMilliseconds = 0;
  let currentStart: number | null = null;
  let currentEnd = 0;

  for (const absence of absences) {
    const start = Math.max(absence.startedAt.getTime(), slice.start);

    if (start >= slice.end) {
      break;
    }

    const end = Math.min(absence.endedAt?.getTime() ?? nowMs, slice.end);

    if (end <= start) {
      continue;
    }

    if (currentStart === null) {
      currentStart = start;
      currentEnd = end;
      continue;
    }

    if (start <= currentEnd) {
      currentEnd = Math.max(currentEnd, end);
      continue;
    }

    totalMilliseconds += currentEnd - currentStart;
    currentStart = start;
    currentEnd = end;
  }

  if (currentStart !== null) {
    totalMilliseconds += currentEnd - currentStart;
  }

  return Math.floor(totalMilliseconds / 1000);
}

function resolveShiftForDay(
  shifts: ShiftPeriodInterval[],
  dayStartMs: number,
  dayEndMs: number,
): ShiftPeriodInterval | null {
  let match: ShiftPeriodInterval | null = null;

  for (const shift of shifts) {
    if (shift.startedAt.getTime() >= dayEndMs) {
      break;
    }

    if (shift.endedAt !== null && shift.endedAt.getTime() <= dayStartMs) {
      continue;
    }

    match = shift;
  }

  return match;
}

export function calculateAvailabilitySeconds(
  absences: AbsenceInterval[],
  periodStart: Date,
  periodEndExclusive: Date,
  now = new Date(),
  shifts: ShiftPeriodInterval[] = [],
): number {
  const slices = getPeriodDaySlices(periodStart, periodEndExclusive);

  const sortedAbsences =
    absences.length > 1
      ? [...absences].sort(
          (left, right) =>
            left.startedAt.getTime() - right.startedAt.getTime(),
        )
      : absences;

  const sortedShifts =
    shifts.length > 1
      ? [...shifts].sort(
          (left, right) =>
            left.startedAt.getTime() - right.startedAt.getTime(),
        )
      : shifts;

  const nowMs = now.getTime();
  let availabilitySeconds = 0;

  for (const slice of slices) {
    const { dayStart, dayEnd } = parseDayBounds(slice.dateKey);
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();
    const shift = resolveShiftForDay(sortedShifts, dayStartMs, dayEndMs);

    const rawShiftSeconds = shift
      ? (shift.endMinutes - shift.startMinutes) * 60
      : DAILY_AVAILABILITY_SECONDS;
    const dailyCapacitySeconds = Math.min(
      DAILY_AVAILABILITY_SECONDS,
      rawShiftSeconds,
    );

    if (dailyCapacitySeconds <= 0) {
      continue;
    }

    const windowStart = shift
      ? dayStartMs + shift.startMinutes * 60_000
      : slice.start;
    const windowEnd = shift
      ? dayStartMs + shift.endMinutes * 60_000
      : slice.end;

    const effectiveSlice: DaySlice = {
      start: Math.max(slice.start, windowStart),
      // Use the full scheduled shift, not elapsed time. Capacity is the day's
      // shift (capped at 8h 48min), even if the turn has just started.
      end: Math.min(slice.end, windowEnd),
      dateKey: slice.dateKey,
    };

    if (effectiveSlice.start >= effectiveSlice.end) {
      continue;
    }

    if (sortedAbsences.length === 0) {
      const openSeconds = Math.floor(
        (effectiveSlice.end - effectiveSlice.start) / 1000,
      );
      availabilitySeconds += Math.min(dailyCapacitySeconds, openSeconds);
      continue;
    }

    const absentSeconds = Math.min(
      dailyCapacitySeconds,
      absentSecondsInSlice(sortedAbsences, effectiveSlice, nowMs),
    );

    const openSeconds = Math.floor(
      (effectiveSlice.end - effectiveSlice.start) / 1000,
    );
    const capacityInPeriod = Math.min(dailyCapacitySeconds, openSeconds);

    availabilitySeconds += capacityInPeriod - absentSeconds;
  }

  return availabilitySeconds;
}

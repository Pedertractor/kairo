import { formatDateKey, parseDayBounds, shiftDateKey } from './app-timezone.js';

export const DAILY_AVAILABILITY_SECONDS = 8 * 60 * 60 + 48 * 60;

export interface AbsenceInterval {
  startedAt: Date;
  endedAt: Date | null;
}

interface DaySlice {
  start: number;
  end: number;
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

    slices.push({ start: sliceStart, end: sliceEnd });

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

export function calculateAvailabilitySeconds(
  absences: AbsenceInterval[],
  periodStart: Date,
  periodEndExclusive: Date,
  now = new Date(),
): number {
  const slices = getPeriodDaySlices(periodStart, periodEndExclusive);

  if (absences.length === 0) {
    return slices.length * DAILY_AVAILABILITY_SECONDS;
  }

  const sorted =
    absences.length > 1
      ? [...absences].sort(
          (left, right) =>
            left.startedAt.getTime() - right.startedAt.getTime(),
        )
      : absences;
  const nowMs = now.getTime();

  let availabilitySeconds = 0;

  for (const slice of slices) {
    const absentSeconds = Math.min(
      DAILY_AVAILABILITY_SECONDS,
      absentSecondsInSlice(sorted, slice, nowMs),
    );

    availabilitySeconds += DAILY_AVAILABILITY_SECONDS - absentSeconds;
  }

  return availabilitySeconds;
}

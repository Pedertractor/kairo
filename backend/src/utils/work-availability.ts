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

/** Half-open [start, end) interval in epoch milliseconds. */
export interface TimeInterval {
  start: number;
  end: number;
}

export interface TeamAllocationEntry {
  startedAt: Date;
  teamId: string;
}

export interface TeamAllocationSegment {
  teamId: string;
  start: number;
  end: number;
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

function mergeAbsenceIntervals(
  absences: AbsenceInterval[],
  window: TimeInterval,
  nowMs: number,
): TimeInterval[] {
  const merged: TimeInterval[] = [];

  for (const absence of absences) {
    const start = Math.max(absence.startedAt.getTime(), window.start);

    if (start >= window.end) {
      break;
    }

    const end = Math.min(absence.endedAt?.getTime() ?? nowMs, window.end);

    if (end <= start) {
      continue;
    }

    const last = merged[merged.length - 1];

    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
      continue;
    }

    merged.push({ start, end });
  }

  return merged;
}

/** Subtracts sorted absence intervals from a single window. */
function subtractIntervals(
  window: TimeInterval,
  absences: TimeInterval[],
): TimeInterval[] {
  const open: TimeInterval[] = [];
  let cursor = window.start;

  for (const absence of absences) {
    if (absence.end <= cursor) {
      continue;
    }

    if (absence.start >= window.end) {
      break;
    }

    if (absence.start > cursor) {
      open.push({
        start: cursor,
        end: Math.min(absence.start, window.end),
      });
    }

    cursor = Math.max(cursor, absence.end);

    if (cursor >= window.end) {
      return open;
    }
  }

  if (cursor < window.end) {
    open.push({ start: cursor, end: window.end });
  }

  return open;
}

function intervalSeconds(interval: TimeInterval): number {
  return Math.max(0, Math.floor((interval.end - interval.start) / 1000));
}

/**
 * Trims open intervals from the end until their total length is at most
 * `maxSeconds`. Preserves chronological order so morning capacity is kept first.
 */
function trimIntervalsToCapacity(
  intervals: TimeInterval[],
  maxSeconds: number,
): TimeInterval[] {
  if (maxSeconds <= 0) {
    return [];
  }

  let remaining = maxSeconds;
  const trimmed: TimeInterval[] = [];

  for (const interval of intervals) {
    const seconds = intervalSeconds(interval);

    if (seconds <= 0) {
      continue;
    }

    if (seconds <= remaining) {
      trimmed.push(interval);
      remaining -= seconds;
      continue;
    }

    trimmed.push({
      start: interval.start,
      end: interval.start + remaining * 1000,
    });
    break;
  }

  return trimmed;
}

function sortAbsences(absences: AbsenceInterval[]): AbsenceInterval[] {
  return absences.length > 1
    ? [...absences].sort(
        (left, right) =>
          left.startedAt.getTime() - right.startedAt.getTime(),
      )
    : absences;
}

function sortShifts(shifts: ShiftPeriodInterval[]): ShiftPeriodInterval[] {
  return shifts.length > 1
    ? [...shifts].sort(
        (left, right) =>
          left.startedAt.getTime() - right.startedAt.getTime(),
      )
    : shifts;
}

/**
 * Per-day open availability intervals after absences, with the daily 8h 48min
 * cap applied once by trimming from the end of each day.
 */
export function getOpenAvailabilityIntervals(
  absences: AbsenceInterval[],
  periodStart: Date,
  periodEndExclusive: Date,
  now = new Date(),
  shifts: ShiftPeriodInterval[] = [],
): TimeInterval[] {
  const slices = getPeriodDaySlices(periodStart, periodEndExclusive);
  const sortedAbsences = sortAbsences(absences);
  const sortedShifts = sortShifts(shifts);
  const nowMs = now.getTime();
  const open: TimeInterval[] = [];

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

    const window: TimeInterval = {
      start: Math.max(slice.start, windowStart),
      // Use the full scheduled shift, not elapsed time. Capacity is the day's
      // shift (capped at 8h 48min), even if the turn has just started.
      end: Math.min(slice.end, windowEnd),
    };

    if (window.start >= window.end) {
      continue;
    }

    const absenceIntervals = mergeAbsenceIntervals(
      sortedAbsences,
      window,
      nowMs,
    );
    const dayOpen = subtractIntervals(window, absenceIntervals);
    open.push(...trimIntervalsToCapacity(dayOpen, dailyCapacitySeconds));
  }

  return open;
}

export function calculateAvailabilitySeconds(
  absences: AbsenceInterval[],
  periodStart: Date,
  periodEndExclusive: Date,
  now = new Date(),
  shifts: ShiftPeriodInterval[] = [],
): number {
  const slices = getPeriodDaySlices(periodStart, periodEndExclusive);
  const sortedAbsences = sortAbsences(absences);
  const sortedShifts = sortShifts(shifts);
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

/**
 * Builds contiguous team ownership segments for a period.
 *
 * The last entry before the period (if any) owns capacity from periodStart
 * until the first switch. Each new entry on a different team switches ownership
 * at that entry's startedAt. If there is no carry-over and no entries, returns
 * an empty list (no team receives availability).
 */
export function buildTeamAllocationSegments(
  periodStart: Date,
  periodEndExclusive: Date,
  carryOverTeamId: string | null,
  entries: TeamAllocationEntry[],
): TeamAllocationSegment[] {
  const periodStartMs = periodStart.getTime();
  const periodEndMs = periodEndExclusive.getTime();

  if (periodStartMs >= periodEndMs) {
    return [];
  }

  const sorted =
    entries.length > 1
      ? [...entries].sort(
          (left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
        )
      : entries;

  const segments: TeamAllocationSegment[] = [];
  let currentTeamId = carryOverTeamId;
  let segmentStart = periodStartMs;

  for (const entry of sorted) {
    const switchAt = entry.startedAt.getTime();

    if (switchAt <= periodStartMs) {
      currentTeamId = entry.teamId;
      segmentStart = periodStartMs;
      continue;
    }

    if (switchAt >= periodEndMs) {
      break;
    }

    if (entry.teamId === currentTeamId) {
      continue;
    }

    if (currentTeamId !== null && switchAt > segmentStart) {
      segments.push({
        teamId: currentTeamId,
        start: segmentStart,
        end: switchAt,
      });
    }

    currentTeamId = entry.teamId;
    segmentStart = switchAt;
  }

  if (currentTeamId !== null && segmentStart < periodEndMs) {
    segments.push({
      teamId: currentTeamId,
      start: segmentStart,
      end: periodEndMs,
    });
  }

  return segments;
}

function intersectSeconds(
  left: TimeInterval,
  right: TimeInterval,
): number {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);

  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Sums open availability seconds that fall inside segments belonging to any of
 * the scoped team IDs.
 */
export function allocateAvailabilitySeconds(
  openIntervals: TimeInterval[],
  segments: TeamAllocationSegment[],
  scopedTeamIds: ReadonlySet<string> | readonly string[],
): number {
  const scoped =
    scopedTeamIds instanceof Set
      ? scopedTeamIds
      : new Set(scopedTeamIds);

  if (scoped.size === 0 || openIntervals.length === 0 || segments.length === 0) {
    return 0;
  }

  const relevant = segments.filter((segment) => scoped.has(segment.teamId));

  if (relevant.length === 0) {
    return 0;
  }

  let total = 0;

  for (const interval of openIntervals) {
    for (const segment of relevant) {
      total += intersectSeconds(interval, segment);
    }
  }

  return total;
}

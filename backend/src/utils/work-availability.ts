import {
  formatDateKey,
  isWeekendDateKey,
  parseDayBounds,
  shiftDateKey,
  zonedDateTimeToUtc,
} from './app-timezone.js';

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

// Share wall-clock conversions across users with the same schedule, as the
// dashboard does for day boundaries. Bound the cache for long-lived processes.
const shiftBoundaryCache = new Map<string, number>();
function shiftBoundaryMs(dateKey: string, minutes: number): number {
  const key = dateKey + ':' + minutes;
  const cached = shiftBoundaryCache.get(key);
  if (cached !== undefined) return cached;
  const instant = zonedDateTimeToUtc(dateKey, Math.floor(minutes / 60), minutes % 60).getTime();
  if (shiftBoundaryCache.size >= 4096) shiftBoundaryCache.clear();
  shiftBoundaryCache.set(key, instant);
  return instant;
}

function buildDayCapacityWindow(
  slice: DaySlice,
  shift: ShiftPeriodInterval | null,
): { window: TimeInterval; dailyCapacitySeconds: number } | null {
  const overnight = shift !== null && shift.endMinutes < shift.startMinutes;
  const rawShiftSeconds = shift
    ? (shift.endMinutes - shift.startMinutes + (overnight ? 1440 : 0)) * 60
    : DAILY_AVAILABILITY_SECONDS;
  const dailyCapacitySeconds = Math.min(
    DAILY_AVAILABILITY_SECONDS,
    rawShiftSeconds,
  );

  if (dailyCapacitySeconds <= 0) {
    return null;
  }

  const windowStart = shift
    ? shiftBoundaryMs(slice.dateKey, shift.startMinutes)
    : slice.start;
  const windowEnd = shift
    ? shiftBoundaryMs(overnight ? shiftDateKey(slice.dateKey, 1) : slice.dateKey, shift.endMinutes)
    : slice.end;

  const window: TimeInterval = {
    start: windowStart,
    // Use the full scheduled shift, not elapsed time. Capacity is the day's
    // shift (capped at 8h 48min), even if the turn has just started.
    end: windowEnd,
  };

  if (window.start >= window.end) {
    return null;
  }

  return { window, dailyCapacitySeconds };
}

function resolveShiftForDay(
  shifts: ShiftPeriodInterval[],
  dayStartMs: number,
  dayEndMs: number,
  dateKey: string,
): ShiftPeriodInterval | null {
  let match: ShiftPeriodInterval | null = null;

  for (const shift of shifts) {
    if (shift.startedAt.getTime() >= dayEndMs) {
      break;
    }

    if (shift.endedAt !== null && shift.endedAt.getTime() <= dayStartMs) {
      continue;
    }

    // Once an overnight occurrence starts, later edits apply to the next
    // occurrence; its continuation keeps the original schedule.
    if (match && match.endMinutes < match.startMinutes) {
      const start = shiftBoundaryMs(dateKey, match.startMinutes);
      if (shift.startedAt.getTime() > start) continue;
    }
    if (shift.endMinutes < shift.startMinutes) {
      const start = shiftBoundaryMs(dateKey, shift.startMinutes);
      if (shift.startedAt.getTime() > start ||
          (shift.endedAt !== null && shift.endedAt.getTime() <= start)) continue;
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
 * cap applied before report clipping or absences. Overnight occurrences belong
 * to their starting weekday, including Friday continuations into Saturday.
 */
export function getOpenAvailabilityIntervals(
  absences: AbsenceInterval[],
  periodStart: Date,
  periodEndExclusive: Date,
  now = new Date(),
  shifts: ShiftPeriodInterval[] = [],
): TimeInterval[] {
  if (periodStart >= periodEndExclusive) return [];
  const previousDate = shiftDateKey(formatDateKey(periodStart), -1);
  const previousBounds = parseDayBounds(previousDate);
  const slices = [
    { dateKey: previousDate, start: previousBounds.dayStart.getTime(), end: previousBounds.dayEnd.getTime() },
    ...getPeriodDaySlices(periodStart, periodEndExclusive),
  ];
  const sortedAbsences = sortAbsences(absences);
  const sortedShifts = sortShifts(shifts);
  const nowMs = now.getTime();
  const open: TimeInterval[] = [];

  for (const slice of slices) {
    if (isWeekendDateKey(slice.dateKey)) {
      continue;
    }

    const { dayStart, dayEnd } = parseDayBounds(slice.dateKey);
    const shift = resolveShiftForDay(
      sortedShifts,
      dayStart.getTime(),
      dayEnd.getTime(),
      slice.dateKey,
    );
    // A newly registered overnight schedule cannot manufacture fallback
    // capacity for an occurrence that started before it became effective.
    if (!shift && sortedShifts.some((period) =>
      period.endMinutes < period.startMinutes &&
      period.startedAt.getTime() < dayEnd.getTime() &&
      (period.endedAt === null || period.endedAt.getTime() > dayStart.getTime())
    )) continue;
    // The extra day only contributes an overnight continuation, never fallback.
    if (slice.dateKey === previousDate && (!shift || shift.endMinutes >= shift.startMinutes)) continue;
    const capacity = buildDayCapacityWindow(slice, shift);

    if (!capacity) {
      continue;
    }

    const absenceIntervals = mergeAbsenceIntervals(
      sortedAbsences,
      capacity.window,
      nowMs,
    );

    if (!shift) {
      // No shift: any same-day absence reduces the 8h 48min budget. Trim the
      // remaining day so later hours cannot refill what the absence removed.
      const absentSeconds = Math.min(
        capacity.dailyCapacitySeconds,
        absenceIntervals.reduce(
          (total, interval) => total + intervalSeconds(interval),
          0,
        ),
      );
      open.push(
        ...trimIntervalsToCapacity(
          subtractIntervals(capacity.window, absenceIntervals),
          capacity.dailyCapacitySeconds - absentSeconds,
        ),
      );
      continue;
    }

    const cappedWindows = trimIntervalsToCapacity(
      [capacity.window],
      capacity.dailyCapacitySeconds,
    );

    for (const capped of cappedWindows) {
      const window = {
        start: Math.max(capped.start, periodStart.getTime()),
        end: Math.min(capped.end, periodEndExclusive.getTime()),
      };
      if (window.start >= window.end) continue;
      open.push(
        ...subtractIntervals(
          window,
          mergeAbsenceIntervals(sortedAbsences, window, nowMs),
        ),
      );
    }
  }

  // Schedule changes can create overlapping windows. Capacity counts each
  // instant once, including when the report contains multiple start days.
  const merged: TimeInterval[] = [];
  for (const interval of open.sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}

export function calculateAvailabilitySeconds(
  absences: AbsenceInterval[],
  periodStart: Date,
  periodEndExclusive: Date,
  now = new Date(),
  shifts: ShiftPeriodInterval[] = [],
): number {
  return getOpenAvailabilityIntervals(
    absences,
    periodStart,
    periodEndExclusive,
    now,
    shifts,
  ).reduce((total, interval) => total + intervalSeconds(interval), 0);
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

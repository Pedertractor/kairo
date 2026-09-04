import {
  formatDateKey,
  parseDayBounds,
  shiftDateKey,
} from './app-timezone.js';

export const DAILY_AVAILABILITY_SECONDS = 8 * 60 * 60 + 48 * 60;

export interface AbsenceInterval {
  startedAt: Date;
  endedAt: Date | null;
}

function mergedDurationSeconds(
  intervals: Array<{ start: number; end: number }>,
): number {
  const sorted = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);

  let totalMilliseconds = 0;
  let currentStart: number | null = null;
  let currentEnd = 0;

  for (const interval of sorted) {
    if (currentStart === null) {
      currentStart = interval.start;
      currentEnd = interval.end;
      continue;
    }

    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
      continue;
    }

    totalMilliseconds += currentEnd - currentStart;
    currentStart = interval.start;
    currentEnd = interval.end;
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
  let availabilitySeconds = 0;
  let dateKey = formatDateKey(periodStart);

  while (true) {
    const { dayStart, dayEnd } = parseDayBounds(dateKey);
    const sliceStart = Math.max(dayStart.getTime(), periodStart.getTime());
    const sliceEnd = Math.min(dayEnd.getTime(), periodEndExclusive.getTime());

    if (sliceStart >= periodEndExclusive.getTime()) {
      break;
    }

    const intervals = absences.map((absence) => ({
      start: Math.max(absence.startedAt.getTime(), sliceStart),
      end: Math.min(
        (absence.endedAt ?? now).getTime(),
        sliceEnd,
      ),
    }));
    const absentSeconds = Math.min(
      DAILY_AVAILABILITY_SECONDS,
      mergedDurationSeconds(intervals),
    );

    availabilitySeconds += DAILY_AVAILABILITY_SECONDS - absentSeconds;

    if (dayEnd.getTime() >= periodEndExclusive.getTime()) {
      break;
    }

    dateKey = shiftDateKey(dateKey, 1);
  }

  return availabilitySeconds;
}

import { getZonedMinutesOfDay } from './app-timezone.js';

const TIME_REGEX = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function parseTimeToMinutes(value: string): number | null {
  const trimmed = value.trim();
  const match = TIME_REGEX.exec(trimmed);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseShiftBounds(
  start: string,
  end: string,
): { startMinutes: number; endMinutes: number } | null {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null;
  }

  return { startMinutes, endMinutes };
}

/**
 * The HR API sends punch times as full timestamps anchored on 1970-01-01
 * (e.g. `1970-01-01T09:00:00.000Z` is 06:00 in São Paulo), so the instant is
 * converted back to app-timezone wall clock. Plain `HH:mm` is also accepted.
 */
export function parseExternalTimeToMinutes(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const plainTime = parseTimeToMinutes(trimmed);

  if (plainTime !== null) {
    return plainTime;
  }

  const instant = new Date(trimmed);

  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  return getZonedMinutesOfDay(instant);
}

export function parseExternalShiftBounds(
  start: string | null | undefined,
  end: string | null | undefined,
): { startMinutes: number; endMinutes: number } | null {
  if (!start || !end) {
    return null;
  }

  const startMinutes = parseExternalTimeToMinutes(start);
  const endMinutes = parseExternalTimeToMinutes(end);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  // Employees without a registered shift come back as midnight to midnight.
  if (startMinutes === 0 && endMinutes === 0) {
    return null;
  }

  // Shifts must close on the same day; overnight ranges are out of scope.
  if (endMinutes <= startMinutes) {
    return null;
  }

  return { startMinutes, endMinutes };
}

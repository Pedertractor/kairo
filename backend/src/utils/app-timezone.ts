export const APP_TIME_ZONE = 'America/Sao_Paulo';

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  return DATE_KEY_REGEX.test(value);
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  formatterCache.set(timeZone, formatter);

  return formatter;
}

function getZonedParts(instant: Date, timeZone = APP_TIME_ZONE) {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const values = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0,
  };

  for (const part of parts) {
    if (part.type in values) {
      values[part.type as keyof typeof values] = Number(part.value);
    }
  }

  return values;
}

function getTimeZoneOffsetMs(instant: Date, timeZone = APP_TIME_ZONE): number {
  const parts = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - instant.getTime();
}

export function zonedDateTimeToUtc(
  dateKey: string,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const guess = new Date(wallAsUtc);
  const offset = getTimeZoneOffsetMs(guess);
  let actual = new Date(wallAsUtc - offset);
  const confirmedOffset = getTimeZoneOffsetMs(actual);

  if (confirmedOffset !== offset) {
    actual = new Date(wallAsUtc - confirmedOffset);
  }

  return actual;
}

export function formatDateKey(date: Date): string {
  const parts = getZonedParts(date);

  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().slice(0, 10);
}

const MAX_CACHED_DAY_STARTS = 4096;

const dayStartCache = new Map<string, number>();

/**
 * Midnight for a given day is fixed, so the timezone conversion is memoized:
 * dashboards resolve the same day boundaries thousands of times per request.
 */
function getDayStartMs(dateKey: string): number {
  const cached = dayStartCache.get(dateKey);

  if (cached !== undefined) {
    return cached;
  }

  const dayStart = zonedDateTimeToUtc(dateKey).getTime();

  if (dayStartCache.size >= MAX_CACHED_DAY_STARTS) {
    dayStartCache.clear();
  }

  dayStartCache.set(dateKey, dayStart);

  return dayStart;
}

export function parseDayBounds(dateKey: string): {
  dayStart: Date;
  dayEnd: Date;
} {
  return {
    dayStart: new Date(getDayStartMs(dateKey)),
    dayEnd: new Date(getDayStartMs(shiftDateKey(dateKey, 1))),
  };
}

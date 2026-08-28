export const APP_TIME_ZONE = 'America/Sao_Paulo';

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  return DATE_KEY_REGEX.test(value);
}

function getZonedParts(instant: Date, timeZone = APP_TIME_ZONE) {
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

  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
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

export function parseDayBounds(dateKey: string): {
  dayStart: Date;
  dayEnd: Date;
} {
  const dayStart = zonedDateTimeToUtc(dateKey);
  const dayEnd = zonedDateTimeToUtc(shiftDateKey(dateKey, 1));

  return { dayStart, dayEnd };
}

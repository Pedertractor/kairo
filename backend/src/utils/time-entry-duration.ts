interface TimeEntryDurationInput {
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
}

export function getEntryDurationSeconds(
  entry: TimeEntryDurationInput,
  now = new Date(),
): number {
  if (entry.durationSeconds !== null) {
    return entry.durationSeconds;
  }

  const end = entry.endedAt ?? now;

  return Math.max(
    0,
    Math.floor((end.getTime() - entry.startedAt.getTime()) / 1000),
  );
}

export function sumEntryDurations(
  entries: TimeEntryDurationInput[],
  now = new Date(),
): number {
  return entries.reduce(
    (total, entry) => total + getEntryDurationSeconds(entry, now),
    0,
  );
}

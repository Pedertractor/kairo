export interface TimelineAbsencePeriod {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
}

export interface DayAbsenceBlock {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

export interface TeamDayAbsenceBlock extends DayAbsenceBlock {
  userId: string;
  userName: string;
}

/**
 * Clips an absence to the selected day. Open-ended periods that already
 * started stay live (`endedAt: null`) so the band can grow with "now".
 * Scheduled open-ended periods are drawn until the end of the day.
 */
export function clipAbsenceToDay(
  period: TimelineAbsencePeriod,
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): DayAbsenceBlock | null {
  const resolvedEnd =
    period.endedAt ??
    (period.startedAt.getTime() > now.getTime() ? dayEnd : now);
  const overlapStart = new Date(
    Math.max(period.startedAt.getTime(), dayStart.getTime()),
  );
  const overlapEnd = new Date(Math.min(resolvedEnd.getTime(), dayEnd.getTime()));

  if (overlapStart >= overlapEnd) {
    return null;
  }

  const isLiveOnThisDay =
    period.endedAt === null &&
    period.startedAt.getTime() <= now.getTime() &&
    overlapStart.getTime() <= now.getTime() &&
    now.getTime() < dayEnd.getTime();

  return {
    id: period.id,
    startedAt: overlapStart.toISOString(),
    endedAt: isLiveOnThisDay ? null : overlapEnd.toISOString(),
  };
}

export function mapAbsencesToDayBlocks(
  periods: TimelineAbsencePeriod[],
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): DayAbsenceBlock[] {
  return periods
    .map((period) => clipAbsenceToDay(period, dayStart, dayEnd, now))
    .filter((block): block is DayAbsenceBlock => block !== null)
    .sort(
      (left, right) =>
        new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime(),
    );
}

export function mapAbsencesToTeamDayBlocks(
  periods: Array<TimelineAbsencePeriod & { userId: string; userName: string }>,
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): TeamDayAbsenceBlock[] {
  return periods
    .map((period) => {
      const clipped = clipAbsenceToDay(period, dayStart, dayEnd, now);

      if (!clipped) {
        return null;
      }

      return {
        ...clipped,
        userId: period.userId,
        userName: period.userName,
      };
    })
    .filter((block): block is TeamDayAbsenceBlock => block !== null)
    .sort(
      (left, right) =>
        new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime(),
    );
}

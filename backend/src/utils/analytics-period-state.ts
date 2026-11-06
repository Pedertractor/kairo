import type { CardStatus } from '../generated/client.js';

interface ActivityPeriodInput {
  createdAt: Date;
  updatedAt: Date;
  status: CardStatus;
  completedAt: Date | null;
  completionDateEstimated: boolean;
  historyEvents: Array<{
    id?: string;
    type: string;
    toStatus: CardStatus | null;
    createdAt: Date;
    estimatedCompletedAt: Date | null;
  }>;
}

/** Uses the effective date of a change, not the date a legacy event was imported. */
export function getActivityPeriodState(
  activity: ActivityPeriodInput,
  periodStart: Date,
  periodEnd: Date,
) {
  const changes = activity.historyEvents.flatMap(event => {
    const estimated = event.type === 'COMPLETION_ESTIMATED';
    const date = estimated ? event.estimatedCompletedAt : event.createdAt;
    if ((!estimated && event.type !== 'STATUS_CHANGED') || !date || !event.toStatus) return [];
    return [{ status: event.toStatus, date, estimated, recordedAt: event.createdAt, id: event.id ?? '' }];
  });

  // Some imports have a persisted completion date without a matching event.
  if (activity.completedAt && !changes.some(change => change.status === 'DONE' && change.date.getTime() === activity.completedAt!.getTime())) {
    changes.push({ status: 'DONE', date: activity.completedAt, estimated: activity.completionDateEstimated, recordedAt: activity.completedAt, id: '' });
  }

  const beforeCutoff = changes
    .filter(change => change.date >= activity.createdAt && change.date < periodEnd)
    .sort((a, b) => b.date.getTime() - a.date.getTime()
      || Number(a.estimated) - Number(b.estimated)
      || b.recordedAt.getTime() - a.recordedAt.getTime()
      || b.id.localeCompare(a.id));
  const last = beforeCutoff[0];
  const status = last?.status
    ?? (activity.status !== 'DONE' && activity.updatedAt < periodEnd ? activity.status : 'TODO');

  return {
    status,
    finishedInPeriod: beforeCutoff.some(change => change.status === 'DONE' && change.date >= periodStart),
    completedAt: status === 'DONE' && last ? last.date.toISOString() : null,
    completionDateEstimated: status === 'DONE' && Boolean(last?.estimated),
  };
}

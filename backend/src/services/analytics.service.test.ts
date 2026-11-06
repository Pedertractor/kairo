import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CardStatus } from '../generated/client.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';

const periodStart = new Date('2026-10-01T03:00:00Z');
const periodEnd = new Date('2026-11-01T03:00:00Z');

function activity(options: {
  id?: string;
  status?: CardStatus;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  completionDateEstimated?: boolean;
  statusesInPeriod?: CardStatus[];
} = {}) {
  return {
    id: options.id ?? 'activity-1',
    teamId: 'team-1',
    title: `Activity ${options.id ?? 'activity-1'}`,
    type: 'ACTIVITY' as const,
    status: options.status ?? 'DONE',
    createdAt: new Date(options.createdAt ?? '2026-09-01T12:00:00Z'),
    updatedAt: new Date(options.updatedAt ?? '2026-11-02T12:00:00Z'),
    completedAt: options.completedAt ? new Date(options.completedAt) : null,
    completionDateEstimated: options.completionDateEstimated ?? false,
    // Most recent event first, matching the repository projection.
    historyEvents: (options.statusesInPeriod ?? []).map((toStatus, index) => ({
      toStatus, type: 'STATUS_CHANGED' as 'STATUS_CHANGED' | 'COMPLETION_ESTIMATED',
      createdAt: new Date(new Date('2026-10-15T12:00:00Z').getTime() - index * 1000),
      estimatedCompletedAt: null as Date | null,
    })),
    tagId: 'tag-1', tag: { name: 'Maintenance', color: '#00ff00' },
    assignedToId: 'member-1', assignedTo: { id: 'member-1', name: 'Ana' },
    complexityLevel: 'MEDIA' as const,
  };
}

function setup(cards: ReturnType<typeof activity>[], tasks: Array<{
  id: string; cardId: string; card: { teamId: string }; title: string; status: CardStatus; createdAt: Date;
  updatedAt: Date; completedAt: Date | null;
  tagId: string | null; tag: { name: string; color: string } | null;
}> = []) {
  const queries: unknown[][] = [];
  const repository = {
    findOwnedTeams: async () => [{ id: 'team-1', name: 'Team', members: [{ user: { id: 'member-1', name: 'Ana' } }] }],
    findProjectsForTeams: async () => [],
    findEntriesForTeams: async () => [],
    findActivityEntriesForTeams: async () => [],
    findActivitiesForClientAnalytics: async () => [],
    findTasksForClientAnalytics: async () => [],
    findCardsForStatusOverview: async (...args: unknown[]) => {
      queries.push(args);
      return cards.map(card => ({ ...card, historyEvents: card.historyEvents.filter(event =>
        event.type === 'STATUS_CHANGED' ? event.createdAt < periodEnd : event.estimatedCompletedAt && event.estimatedCompletedAt < periodEnd,
      ) }));
    },
    findTasksForStatusOverview: async () => tasks,
    findEntriesForUsers: async () => [],
    findLastEntriesBefore: async () => [],
    findFinishedActivitiesForPeriod: async () => cards.filter(card =>
      (card.completedAt && card.completedAt >= periodStart && card.completedAt < periodEnd)
      || card.historyEvents.some(event => {
        const date = event.type === 'COMPLETION_ESTIMATED' ? event.estimatedCompletedAt : event.createdAt;
        return event.toStatus === 'DONE' && date && date >= periodStart && date < periodEnd;
      }),
    ),
    findFinishedTasksForPeriod: async () => [],
  };
  const service = new AnalyticsService(
    repository as unknown as AnalyticsRepository,
    { findOverlappingRange: async () => [] } as never,
    { findOverlappingRange: async () => [] } as never,
  );
  return {
    queries,
    load: () => service.getDashboard('owner-1', { startDate: '2026-10-01', endDate: '2026-10-31' }),
  };
}

describe('Analytics activity completions in the selected period', () => {
  it('lists exactly the items counted per tag, with the status from the selected period', async () => {
    const result = await setup([
      activity({ id: 'completed', status: 'TODO', statusesInPeriod: ['DONE', 'DONE'] }),
      activity({ id: 'created', createdAt: '2026-10-15T12:00:00Z', statusesInPeriod: ['PAUSED'] }),
      activity({ id: 'outside' }),
    ], [{
      id: 'task-1', title: 'Project task', status: 'DONE',
      cardId: 'project-1', card: { teamId: 'team-1' },
      createdAt: new Date('2026-09-01T12:00:00Z'),
      completedAt: new Date('2026-10-20T12:00:00Z'),
      updatedAt: new Date('2026-11-02T12:00:00Z'),
      tagId: null, tag: null,
    }]).load();
    const tag = result.activityOverview.byTag.find(row => row.tagId === 'tag-1')!;
    assert.deepEqual(tag.items, [
      { id: 'completed', teamId: 'team-1', projectId: null, title: 'Activity completed', type: 'ACTIVITY', status: 'DONE', completedAt: '2026-10-15T12:00:00.000Z', completionDateEstimated: false },
      { id: 'created', teamId: 'team-1', projectId: null, title: 'Activity created', type: 'ACTIVITY', status: 'PAUSED', completedAt: null, completionDateEstimated: false },
    ]);
    const untagged = result.activityOverview.byTag.find(row => row.tagId === null)!;
    assert.deepEqual(untagged.items, [{ id: 'task-1', teamId: 'team-1', projectId: 'project-1', title: 'Project task', type: 'TASK', status: 'DONE', completedAt: '2026-10-20T12:00:00.000Z', completionDateEstimated: false }]);
    for (const overview of [result.activityOverview, result.activityOverviewAllTime]) {
      for (const row of overview.byTag) {
        assert.equal(row.items.length, row.count);
        for (const status of row.byStatus) {
          assert.equal(row.items.filter(item => item.status === status.status).length, status.count);
        }
      }
    }
    const allTimeItems = result.activityOverviewAllTime.byTag.find(row => row.tagId === 'tag-1')!.items;
    assert.equal(allTimeItems.find(item => item.id === 'completed')!.status, 'TODO');
    assert.ok(allTimeItems.some(item => item.id === 'outside'));
  });

  for (const status of ['DONE', 'TODO', 'IN_PROGRESS', 'PAUSED', 'CANCELED'] as const) {
    it(`keeps an October completion after later edits or status changes to ${status}`, async () => {
      const { load, queries } = setup([activity({ status, statusesInPeriod: ['DONE'] })]);
      const result = await load();
      assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
      assert.equal(result.activityOverview.activities.total, 1);
      assert.equal(result.activityOverview.activities.byStatus.find(row => row.status === 'DONE')?.count, 1);
      assert.equal(result.activityOverview.byTag[0].byStatus.find(row => row.status === 'DONE')?.count, 1);
      assert.equal(result.memberFinishedActivities[0].activityCount, 1);
      assert.equal(result.memberFinishedActivities[0].weightedScore, 2);
      assert.equal(result.activityOverviewAllTime.activities.byStatus.find(row => row.status === status)?.count, 1);
      assert.deepEqual(queries[0], [['team-1'], periodStart, periodEnd, undefined]);
    });
  }

  it('does not infer a completion from a DONE status or an October update', async () => {
    const { load } = setup([activity({ updatedAt: '2026-10-20T12:00:00Z' })]);
    const result = await load();
    assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
    assert.equal(result.activityOverview.activities.total, 0);
    assert.deepEqual(result.memberFinishedActivities, []);
    assert.equal(result.activityOverviewAllTime.activities.total, 1);
  });

  it('does not include a later completion in the October DONE breakdown', async () => {
    const { load } = setup([activity({ createdAt: '2026-10-15T12:00:00Z', statusesInPeriod: ['PAUSED', 'IN_PROGRESS'] })]);
    const result = await load();
    assert.equal(result.activityOverview.activities.createdInPeriod, 1);
    assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
    assert.equal(result.activityOverview.activities.byStatus.find(row => row.status === 'DONE')?.count, 0);
    assert.equal(result.activityOverview.activities.byStatus.find(row => row.status === 'PAUSED')?.count, 1);
    assert.deepEqual(result.memberFinishedActivities, []);
  });

  it('shows the initial status for an October creation with no status changes in October', async () => {
    const result = await setup([activity({ createdAt: '2026-10-15T12:00:00Z' })]).load();
    assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
    assert.equal(result.activityOverview.activities.byStatus.find(row => row.status === 'DONE')?.count, 0);
    assert.equal(result.activityOverview.activities.byStatus.find(row => row.status === 'TODO')?.count, 1);
  });

  it('counts an activity once even when completed several times in October', async () => {
    const result = await setup([activity({ statusesInPeriod: ['PAUSED', 'DONE', 'TODO', 'DONE'] })]).load();
    assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
    assert.equal(result.activityOverviewAllTime.activities.finishedInPeriod, 1);
    assert.equal(result.memberFinishedActivities[0].activityCount, 1);
    assert.equal(result.activityOverview.byTag[0].count, 1);
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'PAUSED');
    assert.equal(result.activityOverview.byTag[0].items[0].completedAt, null);
  });

  it('keeps the October 30 creation open when its real completion is November 4', async () => {
    const card = activity({ createdAt: '2026-10-30T18:57:51Z', completedAt: '2026-11-04T18:09:49Z', statusesInPeriod: ['DONE'] });
    card.historyEvents[0].createdAt = new Date('2026-11-04T18:09:49Z');
    const result = await setup([card]).load();
    assert.equal(result.activityOverview.activities.createdInPeriod, 1);
    assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'TODO');
    assert.equal(result.activityOverview.byTag[0].items[0].completedAt, null);
    assert.deepEqual(result.memberFinishedActivities, []);
  });

  it('preserves an October completion recovered in November, marking its date as estimated', async () => {
    const card = activity({ createdAt: '2026-10-30T18:57:51Z', completedAt: '2026-10-30T18:57:57Z', completionDateEstimated: true, statusesInPeriod: ['DONE'] });
    card.historyEvents[0].type = 'COMPLETION_ESTIMATED';
    card.historyEvents[0].createdAt = new Date('2026-11-04T18:09:49Z');
    card.historyEvents[0].estimatedCompletedAt = new Date('2026-10-30T18:57:57Z');
    const result = await setup([card]).load();
    assert.equal(result.activityOverview.activities.createdInPeriod, 1);
    assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'DONE');
    assert.equal(result.activityOverview.byTag[0].items[0].completedAt, '2026-10-30T18:57:57.000Z');
    assert.equal(result.activityOverview.byTag[0].items[0].completionDateEstimated, true);
    assert.equal(result.memberFinishedActivities[0].activityCount, 1);
  });

  it('orders recovered completion and reopening by effective date, not import date', async () => {
    const card = activity({ status: 'PAUSED', statusesInPeriod: ['DONE', 'PAUSED'] });
    card.historyEvents[0].type = 'COMPLETION_ESTIMATED';
    card.historyEvents[0].createdAt = new Date('2026-11-04T18:09:49Z');
    card.historyEvents[0].estimatedCompletedAt = new Date('2026-10-08T12:00:00Z');
    card.historyEvents[1].createdAt = new Date('2026-10-20T12:00:00Z');
    const result = await setup([card]).load();
    assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'PAUSED');
    assert.equal(result.activityOverview.byTag[0].items[0].completedAt, null);
  });

  it('counts a persisted October completion even without a corresponding history event', async () => {
    const result = await setup([activity({ completedAt: '2026-10-22T12:00:00Z' })]).load();
    assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'DONE');
    assert.equal(result.activityOverview.byTag[0].items[0].completedAt, '2026-10-22T12:00:00.000Z');
    assert.equal(result.activityOverview.byTag[0].items[0].completionDateEstimated, false);
    assert.equal(result.memberFinishedActivities[0].activityCount, 1);
  });

  it('does not move a November estimated completion into October', async () => {
    const card = activity({ createdAt: '2026-10-30T12:00:00Z', completedAt: '2026-11-04T12:00:00Z', completionDateEstimated: true, statusesInPeriod: ['DONE'] });
    card.historyEvents[0].type = 'COMPLETION_ESTIMATED';
    card.historyEvents[0].createdAt = new Date('2026-11-06T12:00:00Z');
    card.historyEvents[0].estimatedCompletedAt = new Date('2026-11-04T12:00:00Z');
    const result = await setup([card]).load();
    assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'TODO');
    assert.equal(result.activityOverview.byTag[0].items[0].completedAt, null);
  });

  it('counts duplicate persisted, real and estimated completions once, preferring the real event', async () => {
    const card = activity({ completedAt: '2026-10-15T12:00:00Z', completionDateEstimated: true, statusesInPeriod: ['DONE', 'DONE'] });
    card.historyEvents[1].type = 'COMPLETION_ESTIMATED';
    card.historyEvents[1].createdAt = new Date('2026-11-04T12:00:00Z');
    card.historyEvents[1].estimatedCompletedAt = new Date('2026-10-15T12:00:00Z');
    const result = await setup([card]).load();
    assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
    assert.equal(result.activityOverview.activities.total, 1);
    assert.equal(result.activityOverview.byTag[0].items[0].completionDateEstimated, false);
    assert.equal(result.memberFinishedActivities[0].activityCount, 1);
  });

  it('uses the last real status before cutoff rather than the current status', async () => {
    const card = activity({ createdAt: '2026-10-30T18:57:51Z', statusesInPeriod: ['IN_PROGRESS'] });
    card.historyEvents[0].createdAt = new Date('2026-10-31T23:00:00Z');
    const result = await setup([card]).load();
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'IN_PROGRESS');
    assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
  });

  for (const [date, expectedStatus, expectedFinished] of [
    ['2026-11-01T02:59:59.999Z', 'DONE', 1],
    ['2026-11-01T03:00:00.000Z', 'TODO', 0],
  ] as const) {
    it(`respects the end of October in Sao Paulo for a completion at ${date}`, async () => {
      const card = activity({ createdAt: '2026-10-30T12:00:00Z', statusesInPeriod: ['DONE'] });
      card.historyEvents[0].createdAt = new Date(date);
      const result = await setup([card]).load();
      assert.equal(result.activityOverview.activities.finishedInPeriod, expectedFinished);
      assert.equal(result.activityOverview.byTag[0].items[0].status, expectedStatus);
      assert.equal(result.activityOverview.byTag[0].items[0].completedAt, expectedStatus === 'DONE' ? date : null);
    });
  }

  it('does not count a November task completion as DONE in October', async () => {
    const result = await setup([], [{
      id: 'task-future', title: 'Future completion', status: 'DONE',
      cardId: 'project-1', card: { teamId: 'team-1' }, tagId: null, tag: null,
      createdAt: new Date('2026-10-30T12:00:00Z'),
      completedAt: new Date('2026-11-04T12:00:00Z'),
      updatedAt: new Date('2026-11-04T12:00:00Z'),
    }]).load();
    assert.equal(result.activityOverview.tasks.finishedInPeriod, 0);
    assert.equal(result.activityOverview.tasks.byStatus.find(row => row.status === 'DONE')?.count, 0);
    assert.equal(result.activityOverview.byTag[0].items[0].status, 'TODO');
    assert.equal(result.activityOverview.byTag[0].items[0].completedAt, null);
  });
});

describe('Analytics completion history queries', () => {
  function setupRepository() {
    const queries: any[] = [];
    const repository = new AnalyticsRepository({ card: {
      findMany: async (query: unknown) => { queries.push(query); return []; },
    } } as never);
    return { repository, queries };
  }

  it('loads real and recovered changes by their effective date before the cutoff', async () => {
    const { repository, queries } = setupRepository();
    await repository.findCardsForStatusOverview(['team-1'], periodStart, periodEnd, 'member-1');
    assert.deepEqual(queries[0].select.historyEvents, {
      where: { OR: [
        { type: 'STATUS_CHANGED', createdAt: { lt: periodEnd } },
        { type: 'COMPLETION_ESTIMATED', estimatedCompletedAt: { lt: periodEnd } },
      ] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, type: true, toStatus: true, createdAt: true, estimatedCompletedAt: true },
    });
    assert.deepEqual(queries[0].where, { teamId: { in: ['team-1'] }, deletedAt: null, createdById: 'member-1' });
  });

  it('selects unique activities with a completion event, regardless of current status or update date', async () => {
    const { repository, queries } = setupRepository();
    await repository.findFinishedActivitiesForPeriod(['team-1'], periodStart, periodEnd, 'member-1');
    assert.deepEqual(queries[0].where, {
      teamId: { in: ['team-1'] }, type: 'ACTIVITY', deletedAt: null,
      OR: [
        { historyEvents: { some: { OR: [
          { type: 'STATUS_CHANGED', toStatus: 'DONE', createdAt: { gte: periodStart, lt: periodEnd } },
          { type: 'COMPLETION_ESTIMATED', toStatus: 'DONE', estimatedCompletedAt: { gte: periodStart, lt: periodEnd } },
        ] } } },
        { completedAt: { gte: periodStart, lt: periodEnd } },
      ],
      assignedToId: 'member-1',
    });
    assert.equal(queries[0].where.status, undefined);
    assert.equal(queries[0].where.updatedAt, undefined);
  });
});

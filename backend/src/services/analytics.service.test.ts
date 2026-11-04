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
  statusesInPeriod?: CardStatus[];
} = {}) {
  return {
    id: options.id ?? 'activity-1',
    type: 'ACTIVITY' as const,
    status: options.status ?? 'DONE',
    createdAt: new Date(options.createdAt ?? '2026-09-01T12:00:00Z'),
    updatedAt: new Date(options.updatedAt ?? '2026-11-02T12:00:00Z'),
    // Most recent event first, matching the repository projection.
    historyEvents: (options.statusesInPeriod ?? []).map(toStatus => ({ toStatus })),
    tagId: 'tag-1', tag: { name: 'Maintenance', color: '#00ff00' },
    assignedToId: 'member-1', assignedTo: { id: 'member-1', name: 'Ana' },
    complexityLevel: 'MEDIA' as const,
  };
}

function setup(cards: ReturnType<typeof activity>[]) {
  const queries: unknown[][] = [];
  const repository = {
    findOwnedTeams: async () => [{ id: 'team-1', name: 'Team', members: [{ user: { id: 'member-1', name: 'Ana' } }] }],
    findProjectsForTeams: async () => [],
    findEntriesForTeams: async () => [],
    findActivityEntriesForTeams: async () => [],
    findActivitiesForClientAnalytics: async () => [],
    findTasksForClientAnalytics: async () => [],
    findCardsForStatusOverview: async (...args: unknown[]) => { queries.push(args); return cards; },
    findTasksForStatusOverview: async () => [],
    findEntriesForUsers: async () => [],
    findLastEntriesBefore: async () => [],
    findFinishedActivitiesForPeriod: async () => cards.filter(card => card.historyEvents.some(event => event.toStatus === 'DONE')),
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

  it('uses the same inclusive start and exclusive end for overview events', async () => {
    const { repository, queries } = setupRepository();
    await repository.findCardsForStatusOverview(['team-1'], periodStart, periodEnd, 'member-1');
    assert.deepEqual(queries[0].select.historyEvents, {
      where: { type: 'STATUS_CHANGED', createdAt: { gte: periodStart, lt: periodEnd } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { toStatus: true },
    });
    assert.deepEqual(queries[0].where, { teamId: { in: ['team-1'] }, deletedAt: null, createdById: 'member-1' });
  });

  it('selects unique activities with a completion event, regardless of current status or update date', async () => {
    const { repository, queries } = setupRepository();
    await repository.findFinishedActivitiesForPeriod(['team-1'], periodStart, periodEnd, 'member-1');
    assert.deepEqual(queries[0].where, {
      teamId: { in: ['team-1'] }, type: 'ACTIVITY', deletedAt: null,
      historyEvents: { some: { type: 'STATUS_CHANGED', toStatus: 'DONE', createdAt: { gte: periodStart, lt: periodEnd } } },
      assignedToId: 'member-1',
    });
    assert.equal(queries[0].where.status, undefined);
    assert.equal(queries[0].where.updatedAt, undefined);
  });
});

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { it } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/client.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { MachineRepository } from '../repositories/machine.repository.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { TaskService } from './task.service.js';

const url = process.env.KAIRO_ANALYTICS_TEST_DATABASE_URL;
const october = { startDate: '2026-10-01', endDate: '2026-10-31' };
const completion = new Date('2026-10-15T12:00:00Z');

it('analytics completions and tags against isolated PostgreSQL', { skip: !url }, async t => {
  assert.match(new URL(url!).pathname, /_test$/, 'Use an isolated database ending in _test');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const repository = new AnalyticsRepository(prisma);
  const cards = new CardRepository(prisma, () => {});
  const dashboard = new AnalyticsService(repository, new AbsenceRepository(prisma), new ShiftRepository(prisma));
  const taskService = new TaskService(
    new TaskRepository(prisma), cards, new TeamRepository(prisma),
    new TimeEntryRepository(prisma), new FavoriteRepository(prisma),
    new MachineRepository(prisma), new TagRepository(prisma),
  );

  async function fixture(tagged: boolean) {
    const suffix = randomUUID();
    const owner = await prisma.user.create({ data: {
      employeeId: suffix, name: 'Analytics owner', unit: 'TRACTOR', cardNumber: suffix,
      passwordHash: 'test-only', role: 'ADMIN',
    } });
    const member = await prisma.user.create({ data: {
      employeeId: suffix + '-member', name: 'Analytics member', unit: 'TRACTOR', cardNumber: suffix + '-member',
      passwordHash: 'test-only', role: 'USER',
    } });
    const team = await prisma.team.create({ data: {
      name: 'Analytics test', createdById: owner.id,
      members: { create: [{ userId: owner.id, role: 'ADMIN' }, { userId: member.id, role: 'MEMBER' }] },
    } });
    const tag = await prisma.tag.create({ data: { teamId: team.id, name: 'Maintenance', color: '#00ff00' } });
    const project = await prisma.card.create({ data: {
      teamId: team.id, createdById: member.id, title: 'Project', type: 'PROJECT',
      createdAt: new Date('2026-09-01T12:00:00Z'),
    } });
    const activity = (data: Partial<Prisma.CardUncheckedCreateInput> = {}) => prisma.card.create({ data: {
      teamId: team.id, createdById: member.id, assignedToId: member.id,
      title: 'Activity', type: 'ACTIVITY', status: 'DONE', tagId: tagged ? tag.id : null,
      complexityLevel: 'MEDIA', createdAt: new Date('2026-09-01T12:00:00Z'),
      updatedAt: new Date('2026-11-03T12:00:00Z'), ...data,
    } });
    const task = (data: Partial<Prisma.TaskUncheckedCreateInput> = {}) => prisma.task.create({ data: {
      cardId: project.id, createdById: member.id, assignedToId: member.id,
      title: 'Task', status: 'DONE', tagId: tagged ? tag.id : null,
      complexityLevel: 'MEDIA', completedAt: completion,
      createdAt: new Date('2026-09-01T12:00:00Z'), updatedAt: new Date('2026-11-03T12:00:00Z'), ...data,
    } });
    const event = (cardId: string, date = completion, estimated = false) => prisma.cardHistoryEvent.create({ data: {
      cardId, type: estimated ? 'COMPLETION_ESTIMATED' : 'STATUS_CHANGED',
      changedById: estimated ? null : member.id, toStatus: 'DONE',
      createdAt: estimated ? new Date('2026-11-04T12:00:00Z') : date,
      estimatedCompletedAt: estimated ? date : null,
    } });
    return {
      owner, member, team, tag, project, activity, task, event,
      load: (employeeId?: string) => dashboard.getDashboard(owner.id, { ...october, employeeId }),
      cleanup: async () => {
        await prisma.team.delete({ where: { id: team.id } });
        await prisma.user.deleteMany({ where: { id: { in: [owner.id, member.id] } } });
      },
    };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  async function using(tagged: boolean, run: (f: Fixture) => Promise<void>) {
    const f = await fixture(tagged);
    try { await run(f); } finally { await f.cleanup(); }
  }

  try {
    assert.equal(await prisma.card.count(), 0, 'The test database must have no cards');
    for (const tagged of [false, true]) {
      const label = tagged ? 'with tag' : 'without tag';
      for (const estimated of [false, true]) {
        for (const [date, expected] of [
          ['2026-10-01T02:59:59.999Z', 0],
          ['2026-10-01T03:00:00.000Z', 1],
          ['2026-11-01T02:59:59.999Z', 1],
          ['2026-11-01T03:00:00.000Z', 0],
        ] as const) {
          await t.test(`${label}: ${estimated ? 'estimated' : 'real'} activity completion at ${date}`, async () => using(tagged, async f => {
            const activity = await f.activity();
            await f.event(activity.id, new Date(date), estimated);
            const result = await f.load();
            assert.equal(result.activityOverview.activities.finishedInPeriod, expected);
            assert.equal(result.activityOverview.activities.total, expected);
            assert.equal(result.activityOverview.activities.byStatus.find(s => s.status === 'DONE')?.count, expected);
            assert.equal(result.activityOverview.byTag.reduce((n, tag) => n + tag.count, 0), expected);
            assert.equal(result.memberFinishedActivities[0]?.activityCount ?? 0, expected);
            assert.equal(result.activityOverviewAllTime.activities.total, 1);
          }));
        }
      }

      for (const status of ['DONE', 'TODO', 'IN_PROGRESS', 'PAUSED', 'CANCELED'] as const) {
        await t.test(`${label}: activity keeps its October completion with current status ${status}`, async () => using(tagged, async f => {
          const activity = await f.activity({ status });
          await f.event(activity.id);
          const result = await f.load();
          assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
          assert.equal(result.activityOverview.activities.byStatus.find(s => s.status === 'DONE')?.count, 1);
          assert.equal(result.activityOverviewAllTime.activities.byStatus.find(s => s.status === status)?.count, 1);
          assert.equal(result.activityOverview.byTag[0].tagId, tagged ? f.tag.id : null);
          assert.equal(result.activityOverview.byTag[0].byStatus.find(s => s.status === 'DONE')?.count, 1);
          assert.equal(result.memberFinishedActivities[0].weightedScore, 2);
        }));
      }

      await t.test(`${label}: duplicate real and estimated completions count once`, async () => using(tagged, async f => {
        const activity = await f.activity();
        await f.event(activity.id, completion, true);
        await f.event(activity.id);
        await f.event(activity.id, new Date('2026-10-20T12:00:00Z'));
        const result = await f.load();
        assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
        assert.equal(result.activityOverview.byTag[0].count, 1);
        assert.equal(result.memberFinishedActivities[0].activityCount, 1);
      }));

      await t.test(`${label}: DONE and an October update alone do not establish an activity completion`, async () => using(tagged, async f => {
        await f.activity({ updatedAt: completion });
        const result = await f.load();
        assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
        assert.equal(result.activityOverview.activities.total, 0);
      }));

      await t.test(`${label}: October creation completed in November stays out of October DONE`, async () => using(tagged, async f => {
        const activity = await f.activity({ createdAt: completion });
        await f.event(activity.id, new Date('2026-11-02T12:00:00Z'));
        const result = await f.load();
        assert.equal(result.activityOverview.activities.createdInPeriod, 1);
        assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
        assert.equal(result.activityOverview.byTag[0].byStatus.find(s => s.status === 'DONE')?.count, 0);
        assert.equal(result.memberFinishedActivities.length, 0);
      }));

      await t.test(`${label}: creation and completion in October do not double count`, async () => using(tagged, async f => {
        const activity = await f.activity({ createdAt: completion });
        await f.event(activity.id);
        await f.task({ createdAt: completion });
        const result = await f.load();
        for (const overview of [result.activityOverview.activities, result.activityOverview.tasks]) {
          assert.equal(overview.total, 1);
          assert.equal(overview.createdInPeriod, 1);
          assert.equal(overview.finishedInPeriod, 1);
        }
        assert.equal(result.activityOverview.byTag[0].count, 2);
        assert.equal(result.memberFinishedActivities[0].activityCount, 2);
      }));

      await t.test(`${label}: unassigned completions appear in overview but not the member ranking`, async () => using(tagged, async f => {
        const activity = await f.activity({ assignedToId: null });
        await f.event(activity.id);
        await f.task({ assignedToId: null });
        const result = await f.load();
        assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
        assert.equal(result.activityOverview.tasks.finishedInPeriod, 1);
        assert.equal(result.activityOverview.byTag[0].count, 2);
        assert.equal(result.memberFinishedActivities.length, 0);
      }));

      for (const [date, expected] of [
        ['2026-10-01T02:59:59.999Z', 0], ['2026-10-01T03:00:00.000Z', 1],
        ['2026-11-01T02:59:59.999Z', 1], ['2026-11-01T03:00:00.000Z', 0],
      ] as const) {
        await t.test(`${label}: task completion at ${date}`, async () => using(tagged, async f => {
          await f.task({ completedAt: new Date(date) });
          const result = await f.load();
          assert.equal(result.activityOverview.tasks.finishedInPeriod, expected);
          assert.equal(result.activityOverview.tasks.total, expected);
          assert.equal(result.activityOverview.byTag.reduce((n, tag) => n + tag.count, 0), expected);
          assert.equal(result.memberFinishedActivities[0]?.activityCount ?? 0, expected);
        }));
      }

      await t.test(`${label}: editing activity and task tags preserves recorded completion dates`, async () => using(tagged, async f => {
        const activity = await f.activity();
        await f.event(activity.id);
        const task = await f.task();
        const tagId = tagged ? null : f.tag.id;
        await cards.updateActivity(activity.id, { tagId });
        await taskService.updateTask(f.project.id, task.id, f.owner.id, { tagId });
        const result = await f.load();
        assert.equal(result.activityOverview.activities.finishedInPeriod, 1);
        assert.equal(result.activityOverview.tasks.finishedInPeriod, 1);
        assert.equal(result.memberFinishedActivities[0].activityCount, 2);
        assert.equal(result.activityOverview.byTag.length, 1);
        assert.equal(result.activityOverview.byTag[0].tagId, tagId);
        assert.equal(result.activityOverview.byTag[0].count, 2);
      }));

      await t.test(`${label}: deleted activities and tasks are excluded`, async () => using(tagged, async f => {
        const activity = await f.activity({ deletedAt: new Date() });
        await f.event(activity.id);
        await f.task({ deletedAt: new Date() });
        const result = await f.load();
        assert.equal(result.activityOverview.activities.finishedInPeriod, 0);
        assert.equal(result.activityOverview.tasks.finishedInPeriod, 0);
        assert.equal(result.activityOverview.byTag.length, 0);
        assert.equal(result.memberFinishedActivities.length, 0);
      }));

      await t.test(`${label}: member filter keeps matching activities, tasks and tag totals`, async () => using(tagged, async f => {
        const activity = await f.activity();
        await f.event(activity.id);
        await f.task();
        const matching = await f.load(f.member.id);
        assert.equal(matching.activityOverview.activities.finishedInPeriod, 1);
        assert.equal(matching.activityOverview.tasks.finishedInPeriod, 1);
        assert.equal(matching.activityOverview.byTag[0].count, 2);
        assert.equal(matching.memberFinishedActivities[0].activityCount, 2);
        // Ownership permission does not add an ADMIN to the MEMBER picker.
        const filtered = await repository.findFinishedActivitiesForPeriod([f.team.id], new Date('2026-10-01T03:00:00Z'), new Date('2026-11-01T03:00:00Z'), f.owner.id);
        assert.equal(filtered.length, 0);
      }));

      await t.test(`${label}: legacy task uses its original October update when completedAt is missing`, async () => using(tagged, async f => {
        await f.task({ completedAt: null, updatedAt: completion });
        const result = await f.load();
        assert.equal(result.activityOverview.tasks.finishedInPeriod, 1);
        assert.equal(result.activityOverview.byTag[0].count, 1);
        assert.equal(result.memberFinishedActivities[0].activityCount, 1);
      }));

      // These execute the desired historical rule and document reproducible gaps
      // in main. TODO keeps the verification command usable without hiding them.
      await t.test(`${label}: October-created task completed in November should stay out of October DONE breakdown`, {
        todo: 'The task status breakdown uses current status rather than status in the selected month',
      }, async () => using(tagged, async f => {
        await f.task({ createdAt: completion, completedAt: new Date('2026-11-02T12:00:00Z') });
        const result = await f.load();
        assert.equal(result.activityOverview.tasks.finishedInPeriod, 0);
        assert.equal(result.activityOverview.tasks.byStatus.find(s => s.status === 'DONE')?.count, 0);
        assert.equal(result.activityOverview.byTag[0].byStatus.find(s => s.status === 'DONE')?.count, 0);
      }));

      for (const recomplete of [false, true]) {
        await t.test(`${label}: task should retain October completion after ${recomplete ? 'reopening and completing again' : 'reopening'}`, {
          todo: 'TaskService clears completedAt on reopening and tasks have no completion history',
        }, async () => using(tagged, async f => {
          const task = await f.task();
          await taskService.updateTask(f.project.id, task.id, f.owner.id, { status: 'TODO' });
          if (recomplete) await taskService.updateTask(f.project.id, task.id, f.owner.id, { status: 'DONE' });
          const result = await f.load();
          assert.equal(result.activityOverview.tasks.finishedInPeriod, 1);
          assert.equal(result.memberFinishedActivities[0]?.activityCount ?? 0, 1);
        }));
      }

      await t.test(`${label}: changing a legacy task tag should preserve its October completion`, {
        todo: 'Legacy tasks fall back to updatedAt, which changes when editing a tag',
      }, async () => using(tagged, async f => {
        const task = await f.task({ completedAt: null, updatedAt: completion });
        assert.equal((await f.load()).activityOverview.tasks.finishedInPeriod, 1);
        await taskService.updateTask(f.project.id, task.id, f.owner.id, { tagId: tagged ? null : f.tag.id });
        assert.equal((await f.load()).activityOverview.tasks.finishedInPeriod, 1);
      }));
    }
  } finally {
    await prisma.$disconnect();
  }
});

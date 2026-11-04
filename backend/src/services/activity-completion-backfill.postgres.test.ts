import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { it } from 'node:test';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/client.js';
import { backfillActivityCompletions, COMPLETION_BACKFILL_LOCK, CompletionBackfillError } from './activity-completion-backfill.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { CardService } from './card.service.js';
import { CardHistoryRepository } from '../repositories/card-history.repository.js';
import { AnalyticsService } from './analytics.service.js';

const url = process.env.KAIRO_BACKFILL_TEST_DATABASE_URL;

it('completion backfill against isolated PostgreSQL', { skip: !url }, async t => {
  assert.match(new URL(url!).pathname, /_test$/, 'Only an isolated database ending in _test is allowed');
  const client = new Client({ connectionString: url });
  const other = new Client({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  await client.connect();
  await other.connect();
  try {
    assert.equal(await prisma.card.count(), 0, 'The test database must contain no activities or projects');
    async function fixture(run: (f: {
      ownerId: string; memberId: string; teamId: string;
      card: (data?: Partial<Prisma.CardUncheckedCreateInput>) => ReturnType<typeof prisma.card.create>;
    }) => Promise<void>) {
      const suffix = randomUUID();
      const owner = await prisma.user.create({ data: {
        employeeId: suffix, name: 'Backfill owner', unit: 'TRACTOR', cardNumber: suffix,
        passwordHash: 'test-only', role: 'ADMIN',
      } });
      const member = await prisma.user.create({ data: {
        employeeId: suffix + '-member', name: 'Backfill member', unit: 'TRACTOR', cardNumber: suffix + '-member',
        passwordHash: 'test-only', role: 'USER',
      } });
      const team = await prisma.team.create({ data: {
        name: 'Backfill test', createdById: owner.id,
        members: { create: [{ userId: owner.id, role: 'ADMIN' }, { userId: member.id, role: 'MEMBER' }] },
      } });
      const tag = await prisma.tag.create({ data: { teamId: team.id, name: 'Backfill', color: '#ff0000' } });
      const card = (data: Partial<Prisma.CardUncheckedCreateInput> = {}) => prisma.card.create({ data: {
        teamId: team.id, createdById: member.id, assignedToId: member.id,
        title: 'Backfill test activity', type: 'ACTIVITY', status: 'DONE', tagId: tag.id,
        createdAt: new Date('2026-09-01T12:00:00Z'), updatedAt: new Date('2026-10-20T14:30:00.123Z'),
        ...data,
      } });
      try { await run({ ownerId: owner.id, memberId: member.id, teamId: team.id, card }); }
      finally {
        // All deletes are restricted to this fixture's generated identifiers.
        await prisma.team.delete({ where: { id: team.id } });
        await prisma.user.deleteMany({ where: { id: { in: [owner.id, member.id] } } });
      }
    }

    await t.test('preview is read only; apply preserves timestamps, entries and existing dates; reruns do not duplicate events', async () => fixture(async f => {
      const estimated = await f.card();
      const real = await f.card();
      await prisma.cardHistoryEvent.createMany({ data: [
        { cardId: real.id, type: 'STATUS_CHANGED', changedById: f.memberId, fromStatus: 'PAUSED', toStatus: 'DONE', createdAt: new Date('2026-10-10T13:00:00Z') },
        { cardId: real.id, type: 'STATUS_CHANGED', changedById: f.memberId, fromStatus: 'PAUSED', toStatus: 'DONE', createdAt: new Date('2026-10-12T13:00:00Z') },
      ] });
      const existing = await f.card({ completedAt: new Date('2026-10-05T12:00:00Z') });
      const pending = await f.card({ status: 'TODO' });
      const canceled = await f.card({ status: 'CANCELED' });
      const deleted = await f.card({ deletedAt: new Date() });
      const project = await f.card({ type: 'PROJECT' });
      const entry = await prisma.timeEntry.create({ data: {
        cardId: estimated.id, userId: f.memberId,
        startedAt: new Date('2026-10-20T12:00:00Z'), endedAt: new Date('2026-10-20T13:00:00Z'), durationSeconds: 3600,
      } });
      const before = await prisma.card.findMany({ where: { teamId: f.teamId }, orderBy: { id: 'asc' } });
      const preview = await backfillActivityCompletions(client);
      assert.deepEqual([preview.examined, preview.recovered, preview.estimated, preview.errors], [2, 1, 1, 0]);
      assert.deepEqual(await prisma.card.findMany({ where: { teamId: f.teamId }, orderBy: { id: 'asc' } }), before);
      assert.equal(await prisma.cardHistoryEvent.count({ where: { type: 'COMPLETION_ESTIMATED' } }), 0);
      await client.query("SET TIME ZONE 'Pacific/Auckland'");
      const applied = await backfillActivityCompletions(client, { apply: true, batchSize: 1 });
      assert.equal(applied.estimated, 1);
      assert.equal(applied.recovered, 1);
      const updated = await prisma.card.findUniqueOrThrow({ where: { id: estimated.id } });
      assert.deepEqual(updated, { ...estimated, completedAt: estimated.updatedAt, completionDateEstimated: true });
      assert.deepEqual(await prisma.card.findUniqueOrThrow({ where: { id: real.id } }), {
        ...real, completedAt: new Date('2026-10-12T13:00:00Z'),
      });
      for (const untouched of [existing, pending, canceled, deleted, project]) {
        assert.deepEqual(await prisma.card.findUniqueOrThrow({ where: { id: untouched.id } }), untouched);
      }
      assert.deepEqual(await prisma.timeEntry.findUniqueOrThrow({ where: { id: entry.id } }), entry);
      const event = await prisma.cardHistoryEvent.findFirstOrThrow({ where: { cardId: estimated.id } });
      assert.equal(event.changedById, null);
      assert.equal(event.type, 'COMPLETION_ESTIMATED');
      assert.deepEqual(event.estimatedCompletedAt, estimated.updatedAt);
      assert.ok(event.createdAt.getTime() > estimated.updatedAt.getTime());
      assert.equal((await backfillActivityCompletions(client, { apply: true })).examined, 0);
      assert.equal(await prisma.cardHistoryEvent.count({ where: { type: 'COMPLETION_ESTIMATED' } }), 1);

      const historyService = new CardService(...[
        { findActivityById: async () => updated },
        { findMembershipByTeamAndUser: async () => ({ role: 'ADMIN', team: { active: true } }) },
        {}, {}, {}, {}, {}, {}, new CardHistoryRepository(prisma),
      ] as unknown as ConstructorParameters<typeof CardService>);
      const history = await historyService.listActivityHistory(f.teamId, estimated.id, f.ownerId);
      assert.equal(history[0].changedByName, null);
      assert.equal(history[0].estimatedCompletedAt, estimated.updatedAt.toISOString());
      await client.query("SET TIME ZONE 'UTC'");
    }));

    await t.test('invalid dates are reported and left unchanged', async () => fixture(async f => {
      const beforeCreation = await f.card({ updatedAt: new Date('2026-08-01T00:00:00Z') });
      const future = await f.card({ updatedAt: new Date('2099-01-01T00:00:00Z') });
      const rows: string[] = [];
      const result = await backfillActivityCompletions(client, { apply: true, onBatch: proposals => {
        rows.push(...proposals.map(p => p.invalidReason!));
      } });
      assert.equal(result.ignored, 2);
      assert.deepEqual(rows.sort(), ['after_execution_start', 'before_creation']);
      for (const card of [beforeCreation, future]) assert.deepEqual(await prisma.card.findUniqueOrThrow({ where: { id: card.id } }), card);
    }));

    await t.test('another application cannot acquire the session lock', async () => fixture(async f => {
      await f.card();
      await other.query('SELECT pg_advisory_lock($1)', [COMPLETION_BACKFILL_LOCK]);
      try {
        await assert.rejects(backfillActivityCompletions(client, { apply: true }), error =>
          error instanceof CompletionBackfillError && error.report.errors === 1 && error.cause instanceof Error && /andamento/.test(error.cause.message));
        assert.equal(await prisma.card.count({ where: { completedAt: { not: null } } }), 0);
      } finally { await other.query('SELECT pg_advisory_unlock($1)', [COMPLETION_BACKFILL_LOCK]); }
    }));

    await t.test('a failing event insert rolls back its batch and leaves earlier batches restartable', async () => fixture(async f => {
      await f.card({ id: 'backfill-test-a' });
      const failed = await f.card({ id: 'backfill-test-b' });
      await client.query(`CREATE FUNCTION backfill_test_reject_event() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW."cardId" = 'backfill-test-b' THEN RAISE EXCEPTION 'injected event failure'; END IF; RETURN NEW; END $$`);
      await client.query('CREATE TRIGGER backfill_test_failure BEFORE INSERT ON card_history_events FOR EACH ROW EXECUTE FUNCTION backfill_test_reject_event()');
      try {
        await assert.rejects(backfillActivityCompletions(client, { apply: true, batchSize: 1 }), error =>
          error instanceof CompletionBackfillError && error.report.estimated === 1 && error.report.errors === 1);
        assert.deepEqual(await prisma.card.findUniqueOrThrow({ where: { id: failed.id } }), failed);
        assert.equal(await prisma.cardHistoryEvent.count({ where: { cardId: failed.id } }), 0);
        assert.equal(await prisma.cardHistoryEvent.count({ where: { cardId: 'backfill-test-a' } }), 1);
      } finally {
        await client.query('DROP TRIGGER backfill_test_failure ON card_history_events');
        await client.query('DROP FUNCTION backfill_test_reject_event()');
      }
      assert.equal((await backfillActivityCompletions(client, { apply: true })).estimated, 1);
      assert.equal(await prisma.cardHistoryEvent.count({ where: { cardId: 'backfill-test-a' } }), 1);
    }));

    await t.test('a concurrent reopening is revalidated while waiting for its row lock', async () => fixture(async f => {
      const card = await f.card();
      await other.query('BEGIN');
      await other.query('UPDATE cards SET status = \'TODO\' WHERE id = $1', [card.id]);
      const running = backfillActivityCompletions(client, { apply: true });
      // Ensure the worker reached the lock wait before releasing the writer.
      for (let attempts = 0; attempts < 100; attempts++) {
        const blocked = await other.query('SELECT cardinality(pg_blocking_pids(pid)) AS count FROM pg_stat_activity WHERE pid = $1', [(client as any).processID]);
        if (blocked.rows[0]?.count > 0) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      await other.query('COMMIT');
      const result = await running;
      assert.equal(result.estimated, 0);
      assert.equal((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).completedAt, null);
    }));

    await t.test('October analytics use the estimated date, deduplicate real events and survive reopening', async () => fixture(async f => {
      const dates = ['2026-10-01T02:59:59.999Z', '2026-10-01T03:00:00Z', '2026-11-01T02:59:59.999Z', '2026-11-01T03:00:00Z'];
      const cards = await Promise.all(dates.map(date => f.card({ updatedAt: new Date(date) })));
      await backfillActivityCompletions(client, { apply: true });
      await prisma.cardHistoryEvent.create({ data: {
        cardId: cards[1].id, type: 'STATUS_CHANGED', changedById: f.memberId,
        fromStatus: 'PAUSED', toStatus: 'DONE', createdAt: new Date('2026-10-15T12:00:00Z'),
      } });
      const cardRepository = new CardRepository(prisma, () => {});
      await cardRepository.updateActivity(cards[1].id, { status: 'TODO' }, { changedById: f.memberId, fromStatus: 'DONE', toStatus: 'TODO' });
      assert.equal((await prisma.card.findUniqueOrThrow({ where: { id: cards[1].id } })).completionDateEstimated, false);
      const repository = new AnalyticsRepository(prisma);
      const result = await new AnalyticsService(repository, new AbsenceRepository(prisma), new ShiftRepository(prisma))
        .getDashboard(f.ownerId, { startDate: '2026-10-01', endDate: '2026-10-31' });
      assert.equal(result.activityOverview.activities.finishedInPeriod, 2);
      assert.equal(result.activityOverview.activities.byStatus.find(row => row.status === 'DONE')?.count, 2);
      assert.equal(result.activityOverview.byTag[0].count, 2);
      assert.equal(result.memberFinishedActivities[0].activityCount, 2);
      await cardRepository.updateActivity(cards[1].id, { status: 'DONE' }, { changedById: f.memberId, fromStatus: 'TODO', toStatus: 'DONE' });
      const completed = await prisma.card.findUniqueOrThrow({ where: { id: cards[1].id } });
      assert.equal(completed.completionDateEstimated, false);
      assert.ok(completed.completedAt!.getTime() > new Date('2026-11-01T03:00:00Z').getTime());
      assert.equal(await prisma.cardHistoryEvent.count({ where: { cardId: cards[1].id, type: 'COMPLETION_ESTIMATED' } }), 1);
    }));

    await t.test('database rejects anonymous real events', async () => fixture(async f => {
      const card = await f.card();
      await assert.rejects(prisma.cardHistoryEvent.create({ data: { cardId: card.id, type: 'STATUS_CHANGED', toStatus: 'DONE' } }));
    }));
  } finally {
    await client.end();
    await other.end();
    await prisma.$disconnect();
  }
});

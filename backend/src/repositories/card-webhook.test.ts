import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CardRepository } from './card.repository.js';

describe('Card mutation notifications', () => {
  function setup(fail = false, count = 1) {
    const events: string[] = [];
    const card = { id: 'card-1', teamId: 'team-1', integrationSource: 'solicitacao-eng-mecanica' };
    const prisma = {
      card: {
        update: async () => { if (fail) throw new Error('write failed'); events.push('commit'); return card; },
        updateMany: async () => ({ count }),
        findUnique: async () => card,
      },
      task: { updateMany: async () => ({ count: 1 }) },
      $transaction: async (operations: Promise<unknown>[]) => { const result = await Promise.all(operations); events.push('transaction committed'); return result; },
    };
    const repo = new CardRepository(prisma as never, () => events.push('notify'));
    return { events, repo };
  }
  it('emits after activity and project status updates and deletions', async () => {
    const { repo, events } = setup();
    await repo.updateActivityStatus('card-1', 'DONE');
    await repo.updateActivity('card-1', { status: 'DONE' });
    await repo.updateProjectStatus('card-1', 'DONE');
    await repo.softDeleteActivity('card-1', 'user-1');
    assert.deepEqual(events, Array(4).fill(['commit', 'notify']).flat());
  });
  it('emits a project deletion only after the transaction commits', async () => {
    const { repo, events } = setup();
    await repo.softDeleteProject('card-1', 'user-1');
    assert.deepEqual(events, ['commit', 'transaction committed', 'notify']);
  });
  it('does not emit when a write fails', async () => {
    const { repo, events } = setup(true);
    await assert.rejects(repo.updateActivityStatus('card-1', 'DONE'));
    assert.deepEqual(events, []);
  });
  it('notifies timer changes only when a card was updated', async () => {
    for (const count of [0, 1]) {
      const { repo, events } = setup(false, count);
      await repo.updateStatusIfOpen('card-1', 'IN_PROGRESS');
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(events, count ? ['notify'] : []);
    }
  });
});

describe('Activity status history persistence', () => {
  it('writes manual status history inside the activity update', async () => {
    let mutation: any;
    const repo = new CardRepository({ card: {
      update: async (args: unknown) => { mutation = args; return { id: 'card-1' }; },
    } } as never, () => {});
    const transition = { changedById: 'user-1', fromStatus: 'TODO' as const, toStatus: 'DONE' as const };
    await repo.updateActivity('card-1', { status: 'DONE' }, transition);
    assert.deepEqual(mutation.data.historyEvents, {
      create: { type: 'STATUS_CHANGED', ...transition, createdAt: mutation.data.completedAt },
    });
    assert.equal(mutation.data.status, 'DONE');
    assert.ok(mutation.data.completedAt instanceof Date);
    assert.equal(mutation.data.completionDateEstimated, false);

    await repo.updateActivity('card-1', { title: 'Renamed' });
    assert.equal(mutation.data.historyEvents, undefined);
    assert.equal(mutation.data.completedAt, undefined);

    await repo.updateActivity('card-1', { status: 'TODO' }, {
      changedById: 'user-1', fromStatus: 'DONE', toStatus: 'TODO',
    });
    assert.equal(mutation.data.completedAt, null);
    assert.equal(mutation.data.completionDateEstimated, false);
  });

  function setup(status: string, options: { failHistory?: boolean; race?: boolean } = {}) {
    const history: unknown[] = [];
    const effects: string[] = [];
    let currentStatus = status;
    let race = options.race;
    const prisma = {
      card: { findUnique: async () => ({ id: 'card-1' }) },
      $transaction: async (run: (tx: unknown) => Promise<unknown>) => {
        const initialStatus = currentStatus;
        try {
          const result = await run({
            card: {
              findUnique: async () => ({ status: currentStatus, type: 'ACTIVITY', deletedAt: null }),
              updateMany: async ({ where, data }: any) => {
                assert.equal(where.status, currentStatus);
                if (race) { race = false; currentStatus = 'IN_PROGRESS'; return { count: 0 }; }
                currentStatus = data.status;
                return { count: 1 };
              },
            },
            cardHistoryEvent: { create: async ({ data }: any) => {
              if (options.failHistory) throw new Error('history failed');
              history.push(data);
            } },
          });
          effects.push('commit');
          return result;
        } catch (error) {
          currentStatus = initialStatus;
          throw error;
        }
      },
    };
    return {
      repo: new CardRepository(prisma as never, () => effects.push('notify')),
      history, effects, status: () => currentStatus,
    };
  }

  for (const [from, to] of [['TODO', 'IN_PROGRESS'], ['IN_PROGRESS', 'PAUSED']] as const) {
    it(`records timer transitions from ${from} to ${to}`, async () => {
      const { repo, history, effects } = setup(from);
      assert.deepEqual(await repo.updateStatusIfOpen('card-1', to, { changedById: 'user-1' }), { count: 1 });
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(history, [{ cardId: 'card-1', changedById: 'user-1', type: 'STATUS_CHANGED', fromStatus: from, toStatus: to }]);
      assert.deepEqual(effects, ['commit', 'notify']);
    });
  }

  it('does not duplicate history for an unchanged status', async () => {
    const { repo, history } = setup('IN_PROGRESS');
    assert.deepEqual(await repo.updateStatusIfOpen('card-1', 'IN_PROGRESS', { changedById: 'user-2', assignedToId: 'user-2' }), { count: 1 });
    assert.deepEqual(history, []);
  });

  for (const status of ['DONE', 'CANCELED']) {
    it(`does not change or log a timer transition for ${status}`, async () => {
      const { repo, history, effects } = setup(status);
      assert.deepEqual(await repo.updateStatusIfOpen('card-1', 'IN_PROGRESS', { changedById: 'user-1' }), { count: 0 });
      assert.deepEqual(history, []);
      assert.deepEqual(effects, ['commit']);
    });
  }

  it('retries a concurrent change using the latest previous status', async () => {
    const { repo, history } = setup('TODO', { race: true });
    await repo.updateStatusIfOpen('card-1', 'PAUSED', { changedById: 'user-1' });
    assert.deepEqual(history, [{ cardId: 'card-1', changedById: 'user-1', type: 'STATUS_CHANGED', fromStatus: 'IN_PROGRESS', toStatus: 'PAUSED' }]);
  });

  it('rolls back the status and sends no notification when history fails', async () => {
    const { repo, history, effects, status } = setup('TODO', { failHistory: true });
    await assert.rejects(repo.updateStatusIfOpen('card-1', 'IN_PROGRESS', { changedById: 'user-1' }), /history failed/);
    assert.equal(status(), 'TODO');
    assert.deepEqual(history, []);
    assert.deepEqual(effects, []);
  });
});

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

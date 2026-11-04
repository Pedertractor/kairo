import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CardService } from './card.service.js';
import { AppError } from '../utils/errors.js';

function fixture(type: 'ACTIVITY' | 'PROJECT', options: { status?: string; deleted?: boolean; timer?: boolean; allowed?: boolean; member?: boolean } = {}) {
  const effects: string[] = [];
  const card = { id: 'card', teamId: 'team', type, status: options.status ?? 'IN_PROGRESS', title: 'Test',
    createdById: 'owner', assignedToId: null, description: null, estimatedHours: null, deletedAt: options.deleted ? new Date() : null,
    createdAt: new Date(), updatedAt: new Date(), team: { id: 'team', name: 'Team' } };
  const update = async (_id: string, data: { status: string }) => { effects.push('update'); return { ...card, ...data }; };
  const service = new CardService(...[
    { findActivityByIdIncludingDeleted: async () => card, findActivityById: async () => card,
      findProjectByIdIncludingDeleted: async () => card, findProjectById: async () => card,
      updateActivity: update, updateProject: update,
      pauseInProgressProjectTasks: async () => { effects.push('pause-tasks'); } },
    { findMembershipByTeamAndUser: async () => options.member === false ? null : { role: 'MEMBER', team: { active: true, membersCanEditActivities: options.allowed ?? true } } },
    { countActiveByCardId: async () => 0, findActiveManyByProjectId: async () => options.timer ? [{}, {}] : [],
      findActiveManyByCardId: async () => options.timer ? [{}, {}] : [],
      stopEntry: async () => { effects.push('stop'); },
      getLoggedSecondsByCardIds: async () => new Map(), getLoggedSecondsByProjectIds: async () => new Map() },
    { findActivityFavorite: async () => null }, {}, {}, {}, {}, {},
  ] as unknown as ConstructorParameters<typeof CardService>);
  return { effects, cancel: () => type === 'ACTIVITY'
    ? service.cancelIntegrationActivity('team', 'card', 'user')
    : service.cancelIntegrationProject('team', 'card', 'user') };
}

for (const type of ['ACTIVITY', 'PROJECT'] as const) describe(`${type} integration cancellation`, () => {
  it('changes the status while preserving history', async () => {
    const { cancel, effects } = fixture(type);
    assert.equal((await cancel()).status, 'CANCELED');
    assert.deepEqual(effects, type === 'PROJECT' ? ['pause-tasks', 'update'] : ['update']);
  });
  for (const options of [{ status: 'DONE' }, { status: 'CANCELED' }, { deleted: true }]) {
    it(`leaves terminal/deleted cards unchanged ${JSON.stringify(options)}`, async () => {
      const { cancel, effects } = fixture(type, options);
      await cancel();
      assert.deepEqual(effects, []);
    });
  }
  if (type === 'PROJECT') it('preserves project status permissions for team members', async () => {
    const { cancel } = fixture(type, { allowed: false });
    assert.equal((await cancel()).status, 'CANCELED');
  });
  it('stops every active timer before canceling, preserving time entries', async () => {
    const { cancel, effects } = fixture(type, { timer: true });
    assert.equal((await cancel()).status, 'CANCELED');
    assert.deepEqual(effects, ['stop', 'stop', ...(type === 'PROJECT' ? ['pause-tasks'] : []), 'update']);
  });
  const failures = [{ options: { member: false }, statusCode: 404 },
    ...(type === 'ACTIVITY' ? [{ options: { allowed: false, timer: true }, statusCode: 403 }] : [])];
  for (const { options, statusCode } of failures) {
    it(`rejects unavailable cancellation ${JSON.stringify(options)}`, async () => {
      const { cancel, effects } = fixture(type, options);
      await assert.rejects(cancel, (error: unknown) => error instanceof AppError && error.statusCode === statusCode);
      assert.deepEqual(effects, []);
    });
  }
});

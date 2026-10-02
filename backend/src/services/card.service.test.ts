import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CardService } from './card.service.js';
import { AppError } from '../utils/errors.js';
import { updateTeamSchema } from '../schemas/team.schema.js';

function createService(type: 'ACTIVITY' | 'PROJECT', options: {
  role?: 'ADMIN' | 'MEMBER';
  enabled?: boolean;
  creator?: string;
  member?: boolean;
  active?: boolean;
  cardTeamId?: string;
} = {}) {
  const effects: string[] = [];
  const card = {
    id: 'card-1', teamId: options.cardTeamId ?? 'team-1', type,
    createdById: options.creator ?? 'another-user', title: 'Card',
    description: null, status: 'PENDING', estimatedHours: null,
    deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
    team: { id: 'team-1', name: 'Team' },
  };
  const membership = options.member === false ? null : {
    role: options.role ?? 'MEMBER',
    team: { active: options.active ?? true, membersCanDeleteCards: options.enabled ?? false },
  };
  const deleted = { ...card, deletedAt: new Date() };
  const service = new CardService(...[
    {
      findActivityById: async () => card,
      findProjectById: async () => card,
      softDeleteActivity: async () => { effects.push('delete'); return deleted; },
      softDeleteProject: async () => { effects.push('delete'); return [null, deleted]; },
    },
    { findMembershipByTeamAndUser: async () => membership },
    {
      findActiveManyByCardId: async () => { effects.push('entries'); return [{ id: 'entry' }]; },
      findActiveManyByProjectId: async () => { effects.push('entries'); return [{ id: 'entry' }]; },
      stopEntry: async () => { effects.push('stop'); },
    },
    {}, {}, {}, {}, {},
  ] as unknown as ConstructorParameters<typeof CardService>);
  const remove = () => type === 'ACTIVITY'
    ? service.deleteActivity('team-1', 'card-1', 'user-1')
    : service.deleteProject('team-1', 'card-1', 'user-1');
  return { remove, effects };
}

for (const type of ['ACTIVITY', 'PROJECT'] as const) {
  describe(type + ' deletion permission', () => {
    for (const [name, options] of [
      ['any member when enabled', { enabled: true }],
      ['creator when disabled', { creator: 'user-1' }],
      ['team admin when disabled', { role: 'ADMIN' as const }],
    ] as const) {
      it('allows ' + name, async () => {
        const { remove, effects } = createService(type, options);
        const result = await remove();
        assert.ok(result.deletedAt);
        assert.deepEqual(effects, ['entries', 'stop', 'delete']);
      });
    }

    for (const [name, options, statusCode] of [
      ['other member when disabled', {}, 403],
      ['non-member even when enabled', { member: false, enabled: true }, 404],
      ['creator in inactive team', { active: false, creator: 'user-1' }, 404],
      ['card from another team', { cardTeamId: 'team-2', enabled: true }, 404],
    ] as const) {
      it('rejects ' + name + ' before any side effects', async () => {
        const { remove, effects } = createService(type, options);
        await assert.rejects(remove, (error: unknown) =>
          error instanceof AppError && error.statusCode === statusCode);
        assert.deepEqual(effects, []);
      });
    }
  });
}

it('accepts false as a standalone team setting update', () => {
  assert.deepEqual(updateTeamSchema.parse({ membersCanDeleteCards: false }), {
    membersCanDeleteCards: false,
  });
  assert.equal(updateTeamSchema.safeParse({ membersCanDeleteCards: 'false' }).success, false);
});

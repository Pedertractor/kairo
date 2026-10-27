import assert from 'node:assert/strict';
import { it } from 'node:test';
import { TimeEntryService } from './time-entry.service.js';
import { AppError } from '../utils/errors.js';

function setup(options: { production?: boolean; member?: boolean; active?: boolean; teamActive?: boolean; cardTeam?: string; cardType?: string; status?: string; deleted?: boolean } = {}) {
  const effects: string[] = [];
  const user = { id: 'user', name: 'Operator', active: options.active ?? true, production: options.production ?? true };
  const card = options.deleted ? null : {
    id: 'activity', teamId: options.cardTeam ?? 'team', type: options.cardType ?? 'ACTIVITY',
    title: 'Activity', status: options.status ?? 'TODO', assignedToId: 'user',
  };
  const service = new TimeEntryService(...[
    {
      findActiveByUserId: async () => null,
      startTimer: async () => { effects.push('start'); return { id: 'entry', userId: user.id, cardId: 'activity', startedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), endedAt: null }; },
    },
    { findActivityById: async () => card, updateStatusIfOpen: async () => ({ count: 1 }) },
    { findMembershipByTeamAndUser: async (teamId: string, userId: string) => {
      assert.equal(teamId, 'team');
      assert.equal(userId, 'user');
      return options.member === false ? null : { role: 'MEMBER', team: { active: options.teamActive ?? true } };
    } },
    {},
    { findById: async () => user },
    { endCoveringAbsenceAt: async () => {} },
    {},
  ] as unknown as ConstructorParameters<typeof TimeEntryService>);
  return { service, effects };
}

it('allows a production operator to start an activity in a team they belong to', async () => {
  const { service, effects } = setup();
  const timer = await service.startActivityTimer('team', 'activity', 'user');
  assert.equal(timer.activity?.id, 'activity');
  assert.deepEqual(effects, ['start']);
});
for (const [description, options] of [
  ['production nonmember', { member: false }],
  ['regular nonmember', { production: false, member: false }],
  ['inactive operator', { active: false }],
  ['inactive team', { teamActive: false }],
  ['wrong team', { cardTeam: 'another-team' }],
  ['project passed as activity', { cardType: 'PROJECT' }],
  ['deleted activity', { deleted: true }],
  ['finished activity', { status: 'DONE' }],
  ['canceled activity', { status: 'CANCELED' }],
] as const) {
  it(`rejects ${description} before starting an entry`, async () => {
    const { service, effects } = setup(options);
    await assert.rejects(service.startActivityTimer('team', 'activity', 'user'), (e: unknown) => e instanceof AppError);
    assert.deepEqual(effects, []);
  });
}

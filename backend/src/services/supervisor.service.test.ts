import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { ResolvedLeader } from '../repositories/hierarchy.repository.js';
import { AppError } from '../utils/errors.js';
import { SupervisorService } from './supervisor.service.js';

const users = {
  admin: { id: 'admin', name: 'Admin', unit: 'TRACTOR', cardNumber: '1', role: 'ADMIN', active: true },
  supervisor: { id: 'supervisor', name: 'Sup', unit: 'TRACTOR', cardNumber: '900', role: 'SUPERVISOR', active: true },
  leader: { id: 'leader', name: 'Ana', unit: 'TRACTOR', cardNumber: '100', role: 'LEADER', active: true },
  plain: { id: 'plain', name: 'User', unit: 'TRACTOR', cardNumber: '2', role: 'USER', active: true },
} as const;

const leaders: ResolvedLeader[] = [
  {
    leaderCard: '100',
    leaderName: 'ANA API',
    shifts: ['DAY'],
    costCenters: [{ costCenter: '1', description: 'Solda', group: 'SOLDA' }],
    leaderUnit: 'TRACTOR',
    user: users.leader,
  },
  {
    leaderCard: '300',
    leaderName: 'SEM CADASTRO',
    shifts: ['NIGHT'],
    costCenters: [{ costCenter: '2', description: 'Pintura', group: null }],
    leaderUnit: 'PEDERTRACTOR',
    user: null,
  },
];

function makeService() {
  const calls: { supervisorCards: string[]; teamsOf: string[] } = { supervisorCards: [], teamsOf: [] };
  const service = new SupervisorService(
    {
      findUserById: async (id: string) => users[id as keyof typeof users] ?? null,
      findSupervisors: async () => [users.supervisor],
      findLeadersOfSupervisor: async (person: { unit: string; card: string }) => {
        calls.supervisorCards.push(`${person.unit}-${person.card}`);
        return person.card === '900' ? leaders : [];
      },
      findTeamsOwnedBy: async () => [
        { userId: 'leader', team: { id: 't1', members: [{ userId: 'leader' }, { userId: 'a' }, { userId: 'b' }] } },
        { userId: 'leader', team: { id: 't2', members: [{ userId: 'leader' }, { userId: 'b' }, { userId: 'c' }] } },
      ],
    } as never,
    {
      listTeamsOwnedBy: async (leaderId: string) => {
        calls.teamsOf.push(leaderId);
        return [];
      },
    },
  );

  return { service, calls };
}

const isStatus = (status: number) => (error: unknown) =>
  error instanceof AppError && error.statusCode === status;

it('lists the supervisor leaders with team and distinct member counts', async () => {
  const { service, calls } = makeService();
  const result = await service.listLeaders('supervisor', 'ignored-for-supervisors');

  assert.deepEqual(calls.supervisorCards, ['TRACTOR-900']);
  assert.deepEqual(result, [
    {
      userId: 'leader', cardNumber: '100', name: 'Ana', unit: 'TRACTOR', registered: true,
      shifts: ['DAY'], costCenters: leaders[0].costCenters, teamCount: 2, memberCount: 3,
    },
    {
      userId: null, cardNumber: '300', name: 'SEM CADASTRO', unit: 'PEDERTRACTOR', registered: false,
      shifts: ['NIGHT'], costCenters: leaders[1].costCenters, teamCount: 0, memberCount: 0,
    },
  ]);
});

it('lets admins pick a supervisor, and requires one', async () => {
  const { service, calls } = makeService();

  await assert.rejects(service.listLeaders('admin'), isStatus(400));
  assert.equal((await service.listLeaders('admin', 'supervisor')).length, 2);
  assert.deepEqual(calls.supervisorCards, ['TRACTOR-900']);
});

it('denies users that are neither supervisors nor admins', async () => {
  const { service } = makeService();

  await assert.rejects(service.listLeaders('leader'), isStatus(403));
  await assert.rejects(service.listLeaders('plain'), isStatus(403));
  await assert.rejects(service.listLeaders('missing'), isStatus(403));
});

it('only opens the teams of a leader that belongs to the supervisor', async () => {
  const { service, calls } = makeService();

  const result = await service.listLeaderTeams('supervisor', 'leader');
  assert.equal(result.leader.userId, 'leader');
  assert.deepEqual(calls.teamsOf, ['leader']);

  await assert.rejects(service.listLeaderTeams('supervisor', 'someone-else'), isStatus(404));
  assert.deepEqual(calls.teamsOf, ['leader']);
});

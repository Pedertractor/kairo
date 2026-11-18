import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { PrismaClient } from '../generated/client.js';
import { TeamRepository } from './team.repository.js';

const team = {
  id: 'team',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  members: [
    { userId: 'leader', role: 'ADMIN', user: { id: 'leader', name: 'Ana', absent: false } },
    { userId: 'member', role: 'MEMBER', user: { id: 'member', name: 'Bob', absent: false } },
  ],
};
const users: Record<string, { id: string; name: string; role: string; active: boolean; cardNumber: string; unit: string }> = {
  leader: { id: 'leader', name: 'Ana Lider', role: 'LEADER', active: true, cardNumber: '100', unit: 'TRACTOR' },
  member: { id: 'member', name: 'Bob', role: 'USER', active: true, cardNumber: '200', unit: 'TRACTOR' },
  outsider: { id: 'outsider', name: 'Out', role: 'USER', active: true, cardNumber: '300', unit: 'TRACTOR' },
  supervisor: { id: 'supervisor', name: 'SOFIA SUPERVISORA', role: 'SUPERVISOR', active: true, cardNumber: '900', unit: 'PEDERTRACTOR' },
  otherSupervisor: { id: 'otherSupervisor', name: 'Outro', role: 'SUPERVISOR', active: true, cardNumber: '901', unit: 'PEDERTRACTOR' },
  admin: { id: 'admin', name: 'Admin', role: 'ADMIN', active: true, cardNumber: '1', unit: 'TRACTOR' },
};

function repository(options: { teamActive?: boolean } = {}) {
  const currentTeam = { ...team, active: options.teamActive ?? true };
  const prisma = {
    teamMember: {
      findUnique: async ({ where }: any) => {
        const member = currentTeam.members.find((m) => m.userId === where.teamId_userId.userId);
        return member ? { id: `m-${member.userId}`, teamId: 'team', ...member, joinedAt: new Date(), team: currentTeam } : null;
      },
    },
    user: {
      findUnique: async ({ where }: any) => users[where.id] ?? null,
      findMany: async ({ where }: any) => Object.values(users)
        .filter((u) => where.OR.some((key: any) => key.unit === u.unit && key.cardNumber === u.cardNumber)),
    },
    team: { findUnique: async () => currentTeam },
    costCenter: {
      findMany: async ({ where }: any) => {
        const isSofia = where.OR.some((clause: any) => clause.supervisorDayCard === '900' && clause.supervisorDayUnit === 'PEDERTRACTOR');
        return isSofia
          ? [{ costCenter: '1', description: 'CC', group: null, leaderDayCard: '100', leaderDayName: 'Ana Líder', leaderDayUnit: 'TRACTOR', leaderNightCard: null, leaderNightName: null, leaderNightUnit: null, supervisorDayCard: '900', supervisorDayName: 'Sofia Supervisora', supervisorDayUnit: 'PEDERTRACTOR', supervisorNightCard: null, supervisorNightName: null, supervisorNightUnit: null }]
          : [];
      },
    },
  } as unknown as PrismaClient;

  return new TeamRepository(prisma);
}

it('returns the real membership for members, without the read-only flag', async () => {
  const access = await repository().findReadAccessByTeamAndUser('team', 'member');
  assert.equal(access?.role, 'MEMBER');
  assert.equal(access?.readOnly, false);
});

it('denies non-members that are not above the team leader', async () => {
  assert.equal(await repository().findReadAccessByTeamAndUser('team', 'outsider'), null);
  assert.equal(await repository().findReadAccessByTeamAndUser('team', 'otherSupervisor'), null);
  assert.equal(await repository().findReadAccessByTeamAndUser('team', 'missing'), null);
});

it('gives the supervisor of a team admin a read-only view', async () => {
  const access = await repository().findReadAccessByTeamAndUser('team', 'supervisor');
  assert.equal(access?.readOnly, true);
  assert.equal(access?.role, 'ADMIN');
  assert.equal(access?.team.id, 'team');
});

it('denies a supervisor with the same badge in the other unit', async () => {
  users.impostor = { id: 'impostor', name: 'OUTRA PESSOA', role: 'SUPERVISOR', active: true, cardNumber: '900', unit: 'TRACTOR' };
  try {
    assert.equal(await repository().findReadAccessByTeamAndUser('team', 'impostor'), null);
  } finally {
    delete users.impostor;
  }
});

it('gives system admins a read-only view of any team', async () => {
  const access = await repository().findReadAccessByTeamAndUser('team', 'admin');
  assert.equal(access?.readOnly, true);
});

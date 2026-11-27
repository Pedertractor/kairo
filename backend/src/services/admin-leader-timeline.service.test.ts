import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AdminLeaderTimelineService } from './admin-leader-timeline.service.js';

const member = (id: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') => ({
  role,
  user: { id, name: id.charAt(0).toUpperCase() + id.slice(1) },
});

const leaders = [
  {
    id: 'lia',
    name: 'Lia',
    role: 'SUPERVISOR',
    memberships: [
      { team: { id: 't1', members: [member('lia', 'ADMIN'), member('caio'), member('bia')] } },
      // `rui` co-admins t2, so he is not one of Lia's collaborators.
      { team: { id: 't2', members: [member('lia', 'ADMIN'), member('rui', 'ADMIN'), member('bia'), member('ana')] } },
    ],
  },
];

function makeService(calls: unknown[][] = []) {
  const repository = {
    findTeamLeaders: async (userId?: string) =>
      userId ? leaders.filter((leader) => leader.id === userId) : leaders,
  };
  const timeEntryService = {
    getAdminTeamsDayDashboard: async (...args: unknown[]) => {
      calls.push(args);
      return { date: '2026-11-26', stats: { loggedSeconds: 0, changePercent: null, activeMembers: 0 }, blocks: [], absences: [], teams: [], members: [] };
    },
  };
  return new AdminLeaderTimelineService(repository as never, timeEntryService as never);
}

describe('AdminLeaderTimelineService', () => {
  it('lists each leader with the deduplicated plain members of the teams they admin', async () => {
    const [lia] = await makeService().listLeaders();

    assert.equal(lia.teamCount, 2);
    assert.equal(lia.role, 'SUPERVISOR');
    assert.deepEqual(lia.members.map((item) => item.id), ['ana', 'bia', 'caio']);
  });

  it("delegates the day timeline to the leader's team-admin view", async () => {
    const calls: unknown[][] = [];
    await makeService(calls).getLeaderDay('lia', '2026-11-20', 'bia');

    assert.deepEqual(calls, [['lia', '2026-11-20', undefined, 'bia']]);
  });

  it('rejects someone who is not a team-owning leader or supervisor', async () => {
    await assert.rejects(makeService().getLeaderDay('caio'), { statusCode: 404 });
  });
});

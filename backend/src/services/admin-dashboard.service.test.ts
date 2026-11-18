import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AdminDashboardService } from './admin-dashboard.service.js';

const at = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00-03:00`);

describe('AdminDashboardService overnight shifts', () => {
  it('counts an 18:00-02:00 shift on the work day it started', async () => {
    const entry = (startedAt: Date, endedAt: Date) => ({
      userId: 'ana', startedAt, endedAt, type: 'TIMER' as const,
      card: { teamId: 'team-1' }, task: null,
    });
    const repository = {
      findUsers: async () => [{
        id: 'ana', name: 'Ana', employeeId: null, unit: 'TRACTOR', role: 'USER',
        active: true, absent: false, firstLogin: false, createdAt: new Date('2026-01-01T00:00:00Z'),
      }],
      findTeams: async () => [],
      groupCardsByTeamAndType: async () => [],
      countClients: async () => 0,
      groupCardsByTypeAndStatus: async () => [],
      groupTasksByStatus: async () => [],
      groupCreatedCardsByType: async () => [],
      countCreatedTasks: async () => 0,
      findTimeEntries: async () => [
        entry(at('2026-07-03', 18), at('2026-07-04', 2)),
        entry(at('2026-07-06', 18), at('2026-07-07', 2)),
        entry(at('2026-07-07', 18), at('2026-07-08', 2)),
      ],
      findRunningTimers: async () => [],
      findAbsences: async () => [],
    };
    const shifts = {
      findOverlappingRange: async () => [{
        userId: 'ana', startMinutes: 18 * 60, endMinutes: 2 * 60,
        startedAt: new Date('2026-06-01T03:00:00Z'), endedAt: null,
      }],
    };
    const service = new AdminDashboardService(repository as never, shifts as never);
    const result = await service.getDashboard({ startDate: '2026-07-06', endDate: '2026-07-07' });

    assert.deepEqual(
      result.daily.map((day) => [day.date, day.loggedSeconds, day.entryCount]),
      [['2026-07-06', 8 * 3600, 1], ['2026-07-07', 8 * 3600, 1]],
    );
    assert.equal(result.topUsers[0].loggedSeconds, 16 * 3600);
    assert.equal(result.topUsers[0].timeEntryCount, 2);
    assert.equal(result.topUsers[0].availabilitySeconds, 2 * 7 * 3600);
  });
});

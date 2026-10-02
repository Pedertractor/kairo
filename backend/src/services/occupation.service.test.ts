import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { OccupationRepository } from '../repositories/occupation.repository.js';
import { OccupationService } from './occupation.service.js';

type Member = Awaited<ReturnType<OccupationRepository['findActiveNonLeaderMembers']>>[number];
type Entry = Awaited<ReturnType<OccupationRepository['findTimeEntries']>>[number];

const ana: Member = {
  id: 'ana', cardNumber: '100', unit: 'TRACTOR', name: 'Ana', role: 'USER',
};
const bruno: Member = {
  id: 'bruno', cardNumber: '200', unit: 'PEDERTRACTOR', name: 'Bruno', role: 'ADMIN',
};

function entry(startedAt: string, endedAt: string | null, userId = ana.id): Entry {
  return { userId, startedAt: new Date(startedAt), endedAt: endedAt ? new Date(endedAt) : null };
}

function createService(entries: Entry[] = [], members: Member[] = [ana, bruno]) {
  const queries: Array<{ userIds: string[]; periodStart: Date; periodEnd: Date }> = [];
  const repository = {
    findActiveNonLeaderMembers: async () => members,
    findTimeEntries: async (userIds: string[], periodStart: Date, periodEnd: Date) => {
      queries.push({ userIds, periodStart, periodEnd });
      return entries;
    },
  } as unknown as OccupationRepository;
  return { service: new OccupationService(repository), queries };
}

function expectedDates(month: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

describe('OccupationService daily logged hours', () => {
  it('sums entries per collaborator and day, rounding the total to four decimal places', async () => {
    const { service } = createService([
      entry('2026-10-01T11:00:00Z', '2026-10-01T12:30:00Z'),
      entry('2026-10-01T14:00:00Z', '2026-10-01T16:00:00Z'),
      entry('2026-10-02T11:00:00Z', '2026-10-02T11:00:01Z'),
      entry('2026-10-02T12:00:00Z', '2026-10-02T12:00:01Z'),
      entry('2026-10-02T13:00:00Z', '2026-10-02T13:00:01Z'),
      entry('2026-10-01T11:00:00Z', '2026-10-01T12:45:00Z', bruno.id),
    ]);
    const result = await service.getMonthlyOccupation('2026-10');
    assert.equal(result.month, '2026-10');
    assert.equal(result.members[0].hoursByDate['2026-10-01'], 3.5);
    assert.equal(result.members[0].hoursByDate['2026-10-02'], 0.0008);
    assert.equal(result.members[1].hoursByDate['2026-10-01'], 1.75);
    assert.equal(result.members[1].hoursByDate['2026-10-02'], 0);
    assert.deepEqual(Object.keys(result.members[0]), ['cardNumber', 'unit', 'name', 'role', 'hoursByDate']);
    assert.deepEqual(
      result.members.map(({ hoursByDate, ...identity }) => identity),
      membersIdentity(),
    );
  });

  it('includes every month date in chronological order and members without entries', async () => {
    const { service } = createService();
    const result = await service.getMonthlyOccupation('2026-10');
    for (const member of result.members) {
      assert.deepEqual(Object.keys(member.hoursByDate), expectedDates('2026-10', 31));
      assert.ok(Object.values(member.hoursByDate).every((hours) => hours === 0));
    }
    result.members[0].hoursByDate['2026-10-01'] = 2;
    assert.equal(result.members[1].hoursByDate['2026-10-01'], 0);
  });

  it('splits at midnight in Sao Paulo, preserving hours after UTC midnight on the local date', async () => {
    const { service } = createService([
      entry('2026-10-02T02:30:00Z', '2026-10-02T04:15:00Z'),
    ]);
    const { members } = await service.getMonthlyOccupation('2026-10');
    assert.equal(members[0].hoursByDate['2026-10-01'], 0.5);
    assert.equal(members[0].hoursByDate['2026-10-02'], 1.25);
  });

  it('clips both month boundaries and ignores non-overlapping or reversed intervals', async () => {
    const { service, queries } = createService([
      entry('2026-10-01T02:00:00Z', '2026-10-01T04:00:00Z'),
      entry('2026-11-01T02:00:00Z', '2026-11-01T04:00:00Z'),
      entry('2026-09-30T00:00:00Z', '2026-10-01T03:00:00Z'),
      entry('2026-11-01T03:00:00Z', '2026-11-01T04:00:00Z'),
      entry('2026-10-05T11:00:00Z', '2026-10-05T10:00:00Z'),
    ]);
    const { members } = await service.getMonthlyOccupation('2026-10');
    assert.equal(members[0].hoursByDate['2026-10-01'], 1);
    assert.equal(members[0].hoursByDate['2026-10-31'], 1);
    assert.equal(Object.values(members[0].hoursByDate).reduce((total, hours) => total + hours, 0), 2);
    assert.deepEqual(queries[0], {
      userIds: ['ana', 'bruno'],
      periodStart: new Date('2026-10-01T03:00:00Z'),
      periodEnd: new Date('2026-11-01T03:00:00Z'),
    });
  });

  it('ends open timers at one fixed current instant and leaves future dates at zero', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-02T04:30:00Z') });
    const { service } = createService([
      entry('2026-10-02T02:00:00Z', null),
      entry('2026-10-02T05:00:00Z', null),
    ]);
    const { members } = await service.getMonthlyOccupation('2026-10');
    assert.equal(members[0].hoursByDate['2026-10-01'], 1);
    assert.equal(members[0].hoursByDate['2026-10-02'], 1.5);
    for (const date of expectedDates('2026-10', 31).slice(2)) {
      assert.equal(members[0].hoursByDate[date], 0);
    }
  });

  it('clips an open timer to the queried past month', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-02T12:00:00Z') });
    const { service } = createService([entry('2026-11-01T02:00:00Z', null)]);
    const { members } = await service.getMonthlyOccupation('2026-10');
    assert.equal(members[0].hoursByDate['2026-10-31'], 1);
  });

  it('handles leap February and months with 28, 30 and 31 days', async () => {
    for (const [month, days] of [['2024-02', 29], ['2026-02', 28], ['2026-04', 30], ['2026-12', 31]] as const) {
      const { service } = createService();
      const { members } = await service.getMonthlyOccupation(month);
      assert.deepEqual(Object.keys(members[0].hoursByDate), expectedDates(month, days));
    }
    const { service } = createService([entry('2024-02-29T11:00:00Z', '2024-02-29T12:00:00Z')]);
    const { members } = await service.getMonthlyOccupation('2024-02');
    assert.equal(members[0].hoursByDate['2024-02-29'], 1);
  });

  it('includes weekends, hours above 8h48 and independently overlapping entries', async () => {
    const { service } = createService([
      entry('2026-10-03T03:00:00Z', '2026-10-03T15:00:00Z'),
      entry('2026-10-03T04:00:00Z', '2026-10-03T05:00:00Z'),
      entry('2026-10-04T11:00:00Z', '2026-10-04T13:00:00Z'),
    ]);
    const { members } = await service.getMonthlyOccupation('2026-10');
    assert.equal(members[0].hoursByDate['2026-10-03'], 13);
    assert.equal(members[0].hoursByDate['2026-10-04'], 2);
  });

  it('returns an empty members array when no eligible collaborators exist', async () => {
    const { service } = createService([], []);
    assert.deepEqual(await service.getMonthlyOccupation('2026-10'), { month: '2026-10', members: [] });
  });

  it('queries December across the year boundary', async () => {
    const { service, queries } = createService();
    await service.getMonthlyOccupation('2026-12');
    assert.equal(queries[0].periodStart.toISOString(), '2026-12-01T03:00:00.000Z');
    assert.equal(queries[0].periodEnd.toISOString(), '2027-01-01T03:00:00.000Z');
  });
});

function membersIdentity() {
  return [ana, bruno].map(({ id, ...identity }) => identity);
}

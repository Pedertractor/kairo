import assert from 'node:assert/strict';
import { it } from 'node:test';
import { CardService } from './card.service.js';
import { CardRepository } from '../repositories/card.repository.js';
import { indicatorPeriodSchema } from '../schemas/card.schema.js';
import { AppError } from '../utils/errors.js';

const start = new Date('2026-11-01T03:00:00Z');
const end = new Date('2026-12-01T03:00:00Z');

it('selects only non-deleted, finished team activities completed within the half-open period', async () => {
  let query: any;
  const repo = new CardRepository({ card: { findMany: async (input: any) => { query = input; return []; } } } as any);
  await repo.findIndicatorActivities('engineering', start, end);
  assert.deepEqual(query.where, {
    teamId: 'engineering', type: 'ACTIVITY', status: 'DONE', deletedAt: null, completedAt: { gte: start, lt: end },
  });
  assert.deepEqual(Object.keys(query.select).sort(), ['assignedTo', 'client', 'tag']);
});

for (const allowed of [true, false]) it(`enforces team membership before reading indicators (allowed=${allowed})`, async () => {
  let queried = false;
  const service = new CardService(...[
    { findIndicatorActivities: async (teamId: string, from: Date, to: Date) => {
      queried = true; assert.equal(teamId, 'engineering'); assert.equal(from, start); assert.equal(to, end); return [];
    } },
    { findMembershipByTeamAndUser: async () => allowed ? { role: 'MEMBER', team: { active: true } } : null },
    {}, {}, {}, {}, {}, {}, {},
  ] as unknown as ConstructorParameters<typeof CardService>);
  if (allowed) assert.deepEqual(await service.getIndicatorActivities('engineering', 'user', start, end), []);
  else await assert.rejects(() => service.getIndicatorActivities('engineering', 'user', start, end),
    (error: unknown) => error instanceof AppError && error.statusCode === 404);
  assert.equal(queried, allowed);
});

it('rejects invalid, reversed and unbounded indicator periods', () => {
  for (const query of [{ start: 'bad', end: end.toISOString() },
    { start: end.toISOString(), end: start.toISOString() },
    { start: '2020-01-01T00:00:00Z', end: end.toISOString() }]) {
    assert.equal(indicatorPeriodSchema.safeParse(query).success, false);
  }
  assert.equal(indicatorPeriodSchema.safeParse({ start: start.toISOString(), end: end.toISOString() }).success, true);
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProductionSessionService, PRODUCTION_IDLE_MS } from './production-session.service.js';
import type { PrismaClient } from '../generated/client.js';
import { AppError } from '../utils/errors.js';
import { createUserSchema } from '../schemas/user.schema.js';

function setup(age = 0) {
  const record = { id: 'session-1', userId: 'production-user', lastActivityAt: new Date(Date.now() - age) };
  let revoked = false;
  const service = new ProductionSessionService({ productionSession: {
    findFirst: async ({ where }: { where: typeof record }) =>
      !revoked && where.id === record.id && where.userId === record.userId && record.lastActivityAt.getTime() > Date.now() - PRODUCTION_IDLE_MS ? record : null,
    updateMany: async ({ where, data }: { where: typeof record; data: { lastActivityAt: Date } }) => {
      if (revoked || where.id !== record.id || where.userId !== record.userId || record.lastActivityAt.getTime() <= Date.now() - PRODUCTION_IDLE_MS) return { count: 0 };
      record.lastActivityAt = data.lastActivityAt;
      return { count: 1 };
    },
    deleteMany: async () => { revoked = true; return { count: 1 }; },
  } } as unknown as PrismaClient);
  return { service, record };
}
const unauthorized = (e: unknown) => e instanceof AppError && e.statusCode === 401;

describe('production session inactivity', () => {
  it('does not extend inactivity when checking a session (including polling)', async () => {
    const { service, record } = setup(5_000);
    const last = record.lastActivityAt;
    await service.validate(record.id, record.userId);
    await service.validate(record.id, record.userId);
    assert.equal(record.lastActivityAt, last);
  });
  it('rejects sessions at the 15-second boundary and cannot revive them with a heartbeat', async () => {
    const { service, record } = setup(PRODUCTION_IDLE_MS);
    await assert.rejects(service.validate(record.id, record.userId), unauthorized);
    await assert.rejects(service.touch(record.id, record.userId), unauthorized);
  });
  it('renews an active session on interaction', async () => {
    const { service, record } = setup(10_000);
    const previous = record.lastActivityAt.getTime();
    const { expiresAt } = await service.touch(record.id, record.userId);
    assert.ok(record.lastActivityAt.getTime() > previous);
    assert.equal(new Date(expiresAt).getTime() - record.lastActivityAt.getTime(), PRODUCTION_IDLE_MS);
  });
  it('rejects missing, foreign and revoked sessions', async () => {
    const { service, record } = setup();
    await assert.rejects(service.validate(undefined, record.userId), unauthorized);
    await assert.rejects(service.validate(record.id, 'other-user'), unauthorized);
    await service.revoke(record.id, record.userId);
    await assert.rejects(service.validate(record.id, record.userId), unauthorized);
  });
});

it('defaults new users to the existing flow and refuses production administrators', () => {
  const input = { cardNumber: '1', unit: 'TRACTOR' };
  assert.equal(createUserSchema.parse(input).production, false);
  assert.equal(createUserSchema.parse({ ...input, production: true }).production, true);
  assert.equal(createUserSchema.safeParse({ ...input, production: 'true' }).success, false);
  assert.equal(createUserSchema.safeParse({ ...input, production: true, role: 'ADMIN' }).success, false);
  assert.equal(createUserSchema.safeParse({ ...input, production: true, role: 'LEADER' }).success, false);
});

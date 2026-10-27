import assert from 'node:assert/strict';
import { after, before, it } from 'node:test';
import Fastify from 'fastify';
import type { PrismaClient } from '../generated/client.js';
import { isProductionRouteAllowed } from '../utils/production-access.js';
import { AppError } from '../utils/errors.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ??= 'production-tests-secret-at-least-32-characters';
process.env.DEFAULT_PASSWORD ??= 'test-password';
process.env.API_BASE_KEY ??= 'test';
process.env.API_BASE_NAME_APPLICATION ??= 'test';

const { jwtPlugin } = await import('../plugins/jwt.plugin.js');
const { productionRoutes } = await import('../routes/production.route.js');
const { AuthService } = await import('./auth.service.js');
const user = { id: 'production-user', employeeId: 'TRACTOR-1', unit: 'TRACTOR', cardNumber: '1', name: 'Production', production: true, role: 'USER', active: true, absent: false };
let lastActivityAt = new Date();
let active = true;
let production = true;
let hasMemberships = true;
const app = Fastify();
app.decorate('prisma', {
  user: { findUnique: async ({ where }: { where: { id?: string; unit_cardNumber?: { unit: string; cardNumber: string } } }) => {
    if (where.id) return { active, production };
    if (where.unit_cardNumber?.unit !== user.unit || where.unit_cardNumber.cardNumber !== user.cardNumber) return null;
    return { ...user, active, production };
  } },
  productionSession: {
    deleteMany: async () => ({ count: 0 }),
    create: async () => ({ id: 'session-1', userId: user.id, lastActivityAt: new Date() }),
    findFirst: async ({ where }: { where: { id: string; userId: string; lastActivityAt: { gt: Date } } }) =>
      where.id === 'session-1' && where.userId === user.id && lastActivityAt > where.lastActivityAt.gt ? { id: 'session-1', lastActivityAt } : null,
  },
  card: { findMany: async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, {
      type: 'ACTIVITY', deletedAt: null,
      team: { active: true, members: { some: { userId: user.id } } },
    });
    if (!hasMemberships) return [];
    return [
      { id: 'activity', title: 'Activity', teamId: 'team', status: 'TODO', team: { name: 'Team' } },
      { id: 'untouched', title: 'Untouched', teamId: 'other-member-team', status: 'TODO', team: { name: 'Other member team' } },
    ];
  } },
  timeEntry: { groupBy: async ({ by, where, _max }: { by: string[]; where: unknown; _max: unknown }) => {
    assert.deepEqual(by, ['cardId']);
    assert.deepEqual(where, { userId: user.id, cardId: { in: ['activity', 'untouched'] } });
    assert.deepEqual(_max, { startedAt: true });
    return [{ cardId: 'activity', _max: { startedAt: new Date('2026-10-22T12:00:00.000Z') } }];
  } },
} as unknown as PrismaClient);
app.setErrorHandler((e, _req, reply) => {
  reply.code(e instanceof AppError ? e.statusCode : 500).send({ mensagem: e.message });
});
before(async () => {
  await app.register(jwtPlugin);
  await app.register(productionRoutes, { prefix: '/api' });
  for (const url of ['/api/users', '/api/teams', '/api/time-entries/day']) {
    app.get(url, { preHandler: [app.authenticate] }, async () => ({ private: true }));
  }
  await app.ready();
});
after(() => app.close());
const headers = (payload: object) => ({ authorization: `Bearer ${app.jwt.sign(payload)}` });

it('allows production login without password, issues no refresh token, returns no password hash', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/production/login', payload: { unit: 'TRACTOR', cardNumber: '1' } });
  assert.equal(response.statusCode, 200);
  const { dados } = response.json();
  assert.equal(dados.user.production, true);
  assert.equal(dados.user.firstLogin, false);
  assert.equal(dados.refreshToken, undefined);
  assert.equal(dados.user.passwordHash, undefined);
  assert.equal(app.jwt.verify<{ productionSessionId: string }>(dados.token).productionSessionId, 'session-1');
});
it('rejects inactive, regular, wrong-unit and unknown production logins', async () => {
  for (const [enabled, prod, unit, cardNumber] of [[false, true, 'TRACTOR', '1'], [true, false, 'TRACTOR', '1'], [true, true, 'PEDERTRACTOR', '1'], [true, true, 'TRACTOR', 'unknown']] as const) {
    active = enabled; production = prod;
    const response = await app.inject({ method: 'POST', url: '/api/production/login', payload: { unit, cardNumber } });
    assert.equal(response.statusCode, 401);
  }
  active = true; production = true;
});
it('only gives activity access to a valid production-scoped token', async () => {
  lastActivityAt = new Date();
  const response = await app.inject({ url: '/api/production/activities', headers: headers({ sub: user.id, productionSessionId: 'session-1' }) });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().dados.activities.length, 2);
  assert.equal(response.json().dados.activities[0].lastWorkedAt, '2026-10-22T12:00:00.000Z');
  assert.equal(response.json().dados.activities[1].lastWorkedAt, null);
  assert.equal((await app.inject({ url: '/api/production/activities', headers: headers({ sub: user.id }) })).statusCode, 401);
  production = false;
  assert.equal((await app.inject({ url: '/api/production/activities', headers: headers({ sub: user.id }) })).statusCode, 403);
  production = true;
});
it('blocks direct API access to users, teams and timeline even with a valid kiosk token', async () => {
  for (const url of ['/api/users', '/api/teams', '/api/time-entries/day']) {
    assert.equal((await app.inject({ url, headers: headers({ sub: user.id, productionSessionId: 'session-1' }) })).statusCode, 403);
  }
});
it('returns no activities or personal history when the operator has no team memberships', async () => {
  hasMemberships = false;
  try {
    const response = await app.inject({ url: '/api/production/activities', headers: headers({ sub: user.id, productionSessionId: 'session-1' }) });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().dados.activities, []);
  } finally {
    hasMemberships = true;
  }
});
it('rejects production access after inactivity, even when the JWT is still valid', async () => {
  lastActivityAt = new Date(Date.now() - 15_000);
  assert.equal((await app.inject({ url: '/api/production/activities', headers: headers({ sub: user.id, productionSessionId: 'session-1' }) })).statusCode, 401);
  lastActivityAt = new Date();
});
it('keeps ordinary users on their existing authorized API flow', async () => {
  production = false;
  assert.equal((await app.inject({ url: '/api/users', headers: headers({ sub: user.id }) })).statusCode, 200);
  production = true;
});
it('rejects production users at ordinary password login and password change', async () => {
  const service = new AuthService(...[
    { findByUnitAndCardNumber: async () => user }, {}, {}, {},
  ] as unknown as ConstructorParameters<typeof AuthService>);
  await assert.rejects(service.login({ unit: 'TRACTOR', cardNumber: '1', password: 'anything' }), (e: unknown) => e instanceof AppError && e.statusCode === 401);
  await assert.rejects(service.changePassword({ unit: 'TRACTOR', cardNumber: '1', currentPassword: 'anything', newPassword: 'new', confirmPassword: 'new' }), (e: unknown) => e instanceof AppError && e.statusCode === 401);
});
it('fails closed for unlisted methods and task timers', () => {
  assert.equal(isProductionRouteAllowed('DELETE', '/api/production/activities'), false);
  assert.equal(isProductionRouteAllowed('POST', '/api/projects/:projectId/tasks/:taskId/time-entries'), false);
  assert.equal(isProductionRouteAllowed('POST', '/api/teams/:teamId/activities/:activityId/time-entries'), true);
});
it('rate limits attempts on the passwordless login', async () => {
  let status = 0;
  for (let i = 0; i < 21; i++) status = (await app.inject({ method: 'POST', url: '/api/production/login', payload: { unit: 'TRACTOR', cardNumber: 'missing' } })).statusCode;
  assert.equal(status, 429);
});

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import Fastify from 'fastify';
import type { PrismaClient, User, UserRole } from '../generated/client.js';
import { AppError } from '../utils/errors.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ??= 'admin-time-entry-tests-secret-at-least-32-chars';
process.env.DEFAULT_PASSWORD ??= 'test-password';
process.env.API_BASE_KEY ??= 'test';
process.env.API_BASE_NAME_APPLICATION ??= 'test';

const { adminTimeEntryRoutes } = await import('./admin-time-entry.route.js');
const { jwtPlugin } = await import('../plugins/jwt.plugin.js');

const makeUser = (id: string, role: UserRole, overrides: Partial<User> = {}): User => ({
  id, employeeId: `TRACTOR-${id}`, name: id, unit: 'TRACTOR', cardNumber: id,
  role, production: false, active: true, firstLogin: false, passwordHash: 'x',
  absent: false, absencesSeenAt: null, authVersion: 0, createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

let users: Record<string, User>;
let dataTouches: string[];
let app: ReturnType<typeof Fastify>;

// Any access to time-entry data is recorded, so denied requests can prove
// they never reached the data layer.
function touch<T>(name: string, value: T) {
  return async () => {
    dataTouches.push(name);
    return value;
  };
}

beforeEach(async () => {
  users = {
    admin: makeUser('admin', 'ADMIN'),
    leader: makeUser('leader', 'LEADER'),
    supervisor: makeUser('supervisor', 'SUPERVISOR'),
    user: makeUser('user', 'USER'),
    inactiveAdmin: makeUser('inactiveAdmin', 'ADMIN', { active: false }),
    staleAdmin: makeUser('staleAdmin', 'ADMIN', { authVersion: 3 }),
  };
  dataTouches = [];

  const prisma = {
    user: {
      findUnique: async ({ where }: any) => (users[where.id] ? { ...users[where.id] } : null),
      findMany: touch('user.findMany', []),
    },
    timeEntry: {
      findMany: touch('timeEntry.findMany', []),
      count: touch('timeEntry.count', 0),
      findUnique: touch('timeEntry.findUnique', null),
      create: touch('timeEntry.create', null),
      update: touch('timeEntry.update', null),
      delete: touch('timeEntry.delete', null),
    },
    timeEntryAuditLog: {
      findMany: touch('timeEntryAuditLog.findMany', []),
      create: touch('timeEntryAuditLog.create', null),
    },
    card: { findMany: touch('card.findMany', []), findFirst: touch('card.findFirst', null) },
    task: { findMany: touch('task.findMany', []), findFirst: touch('task.findFirst', null) },
    $transaction: touch('$transaction', null),
    $queryRaw: touch('$queryRaw', []),
  } as unknown as PrismaClient;

  app = Fastify();
  app.decorate('prisma', prisma);
  app.setErrorHandler((error, _request, reply) => {
    reply.code(error instanceof AppError ? error.statusCode : 500).send({ mensagem: error.message });
  });
  await app.register(jwtPlugin);
  await app.register(adminTimeEntryRoutes, { prefix: '/api' });
  await app.ready();
});
afterEach(() => app.close());

const auth = (sub: string, authVersion?: number) => ({
  authorization: `Bearer ${app.jwt.sign({ sub, ...(authVersion !== undefined ? { authVersion } : {}) })}`,
});

const validCreate = {
  userId: 'user',
  cardId: 'card1',
  startedAt: '2026-11-20T11:00:00.000Z',
  endedAt: '2026-11-20T12:00:00.000Z',
};

const endpoints: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; url: string; payload?: unknown }[] = [
  { method: 'GET', url: '/api/admin/time-entries' },
  { method: 'GET', url: '/api/admin/time-entries/users' },
  { method: 'GET', url: '/api/admin/time-entries/work-items?search=x' },
  { method: 'GET', url: '/api/admin/time-entries/entry1/audit' },
  { method: 'POST', url: '/api/admin/time-entries', payload: validCreate },
  { method: 'PATCH', url: '/api/admin/time-entries/entry1', payload: { note: 'x' } },
  { method: 'DELETE', url: '/api/admin/time-entries/entry1' },
];

describe('admin time entry routes access control', () => {
  for (const endpoint of endpoints) {
    const label = `${endpoint.method} ${endpoint.url}`;

    it(`${label}: rejects every non-admin role with 403 before touching data`, async () => {
      for (const actor of ['leader', 'supervisor', 'user']) {
        const response = await app.inject({ ...endpoint, headers: auth(actor) });
        assert.equal(response.statusCode, 403, `${actor}: ${response.body}`);
      }
      assert.deepEqual(dataTouches, []);
    });

    it(`${label}: rejects anonymous, API-key, inactive and stale-session callers with 401`, async () => {
      const cases = [
        {},
        { 'x-api-key': 'kairo_some_api_key' },
        { authorization: 'Bearer not-a-jwt' },
        auth('inactiveAdmin'),
        auth('staleAdmin', 0),
        auth('ghost'),
      ];
      for (const headers of cases) {
        const response = await app.inject({ ...endpoint, headers });
        assert.equal(response.statusCode, 401, `${JSON.stringify(headers)}: ${response.body}`);
      }
      assert.deepEqual(dataTouches, []);
    });
  }

  it('turns non-admins away before parsing the body', async () => {
    for (const payload of ['', '{not json']) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/time-entries',
        headers: { ...auth('leader'), 'content-type': 'application/json' },
        payload,
      });
      assert.equal(response.statusCode, 403, response.body);
    }
    assert.deepEqual(dataTouches, []);
  });

  it('rejects a user demoted after the token was issued', async () => {
    const headers = auth('admin');
    users.admin = { ...users.admin, role: 'LEADER' };
    const response = await app.inject({ method: 'GET', url: '/api/admin/time-entries', headers });
    assert.equal(response.statusCode, 403);
    assert.deepEqual(dataTouches, []);
  });

  it('lets an active admin read', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/admin/time-entries', headers: auth('admin') });
    assert.equal(list.statusCode, 200, list.body);
    assert.deepEqual(list.json().dados.timeEntries, []);

    const usersResponse = await app.inject({ method: 'GET', url: '/api/admin/time-entries/users', headers: auth('admin') });
    assert.equal(usersResponse.statusCode, 200, usersResponse.body);
  });

  it('rejects unknown or forbidden fields for admins too', async () => {
    const cases = [
      { method: 'POST' as const, url: '/api/admin/time-entries', payload: { ...validCreate, type: 'TIMER' } },
      { method: 'POST' as const, url: '/api/admin/time-entries', payload: { ...validCreate, taskId: 'task1' } },
      { method: 'PATCH' as const, url: '/api/admin/time-entries/entry1', payload: { userId: 'other' } },
      { method: 'PATCH' as const, url: '/api/admin/time-entries/entry1', payload: { durationSeconds: 1 } },
      { method: 'PATCH' as const, url: '/api/admin/time-entries/entry1', payload: {} },
      { method: 'GET' as const, url: '/api/admin/time-entries?userId=a%20b' },
      { method: 'GET' as const, url: '/api/admin/time-entries?pageSize=1000' },
    ];
    for (const request of cases) {
      const response = await app.inject({ ...request, headers: auth('admin') });
      assert.equal(response.statusCode, 400, `${request.method} ${request.url} ${JSON.stringify(request.payload)}: ${response.body}`);
    }
    assert.deepEqual(dataTouches, []);
  });
});

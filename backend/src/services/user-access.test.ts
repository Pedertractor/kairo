import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, it } from 'node:test';
import bcrypt from 'bcryptjs';
import Fastify from 'fastify';
import type { PrismaClient, User, UserRole } from '../generated/client.js';
import { UserRepository } from '../repositories/user.repository.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import type { AbsenceService } from './absence.service.js';
import type { ShiftService } from './shift.service.js';
import { AppError } from '../utils/errors.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ??= 'user-access-tests-secret-at-least-32-characters';
process.env.DEFAULT_PASSWORD ??= 'test-password';
process.env.API_BASE_KEY ??= 'test';
process.env.API_BASE_NAME_APPLICATION ??= 'test';

const { userRoutes } = await import('../routes/user.route.js');
const { productionRoutes } = await import('../routes/production.route.js');
const { jwtPlugin } = await import('../plugins/jwt.plugin.js');
const { AuthService } = await import('./auth.service.js');
const password = 'existing-password';
const passwordHash = await bcrypt.hash(password, 4);
const refreshToken = 'existing-refresh-token';
const makeUser = (id: string, role: UserRole = 'USER'): User => ({
  id, employeeId: `TRACTOR-${id}`, name: id, unit: 'TRACTOR', cardNumber: id,
  role, production: false, active: true, firstLogin: true, passwordHash,
  absent: false, absencesSeenAt: null, createdAt: new Date(), updatedAt: new Date(),
});
type Session = { id: string; userId: string; lastActivityAt: Date };
type State = {
  users: Record<string, User>;
  sessions: Session[];
  tokens: { id: string; userId: string; tokenHash: string; revokedAt: Date | null; expiresAt: Date }[];
};
let state: State;
let app: ReturnType<typeof Fastify>;
let prisma: PrismaClient;
let failRevocation: boolean;
let transactions: number;
let revocations: number;
let canManage: boolean;

// A transactional Prisma double exercises the real route, service and repository.
function models(getState: () => State) {
  return {
    user: {
      findUnique: async ({ where }: any) => {
        const users = getState().users;
        const user = where.id ? users[where.id] : Object.values(users).find((u) =>
          u.unit === where.unit_cardNumber.unit && u.cardNumber === where.unit_cardNumber.cardNumber);
        return user ? { ...user } : null;
      },
      findUniqueOrThrow: async ({ where }: any) => ({ ...getState().users[where.id] }),
      findMany: async () => Object.values(getState().users).filter((u) => u.active),
      count: async ({ where }: any) => Object.values(getState().users).filter((u) =>
        u.active && u.role === 'ADMIN' && u.id !== where.id?.not).length,
      update: async ({ where, data }: any) => {
        const user = { ...getState().users[where.id], ...data };
        getState().users[where.id] = user;
        return user;
      },
    },
    userShiftPeriod: { findMany: async () => [] },
    teamMember: { findFirst: async () => canManage ? { id: 'membership' } : null },
    productionSession: {
      deleteMany: async ({ where }: any) => {
        const before = getState().sessions.length;
        getState().sessions = getState().sessions.filter((s) => where.userId
          ? s.userId !== where.userId : s.lastActivityAt > where.lastActivityAt.lte);
        return { count: before - getState().sessions.length };
      },
      create: async ({ data }: any) => {
        const session = { id: `session-${Date.now()}-${Math.random()}`, ...data, lastActivityAt: new Date() };
        getState().sessions.push(session);
        return session;
      },
      findFirst: async ({ where }: any) => getState().sessions.find((s) =>
        s.id === where.id && s.userId === where.userId && s.lastActivityAt > where.lastActivityAt.gt) ?? null,
    },
    refreshToken: {
      updateMany: async ({ where, data }: any) => {
        revocations++;
        if (failRevocation) throw new AppError(503, 'Revocation unavailable');
        for (const token of getState().tokens) {
          if (token.userId === where.userId && token.revokedAt === null) Object.assign(token, data);
        }
        return { count: 1 };
      },
      findUnique: async ({ where }: any) => {
        const token = getState().tokens.find((t) => t.tokenHash === where.tokenHash);
        return token ? { ...token, user: getState().users[token.userId] } : null;
      },
    },
  };
}

beforeEach(async () => {
  state = {
    users: { admin: makeUser('admin', 'ADMIN'), leader: makeUser('leader', 'LEADER'), target: makeUser('target'), other: makeUser('other') },
    sessions: ['target', 'other'].map((userId) => ({ id: `${userId}-session`, userId, lastActivityAt: new Date() })),
    tokens: ['target', 'other'].map((userId) => ({ id: `${userId}-token`, userId,
      tokenHash: createHash('sha256').update(userId === 'target' ? refreshToken : 'other-token').digest('hex'),
      revokedAt: null, expiresAt: new Date(Date.now() + 60_000) })),
  };
  failRevocation = false;
  transactions = 0;
  revocations = 0;
  canManage = true;
  prisma = {
    ...models(() => state),
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      transactions++;
      const draft = structuredClone(state);
      const result = await work(models(() => draft));
      state = draft;
      return result;
    },
  } as unknown as PrismaClient;
  app = Fastify();
  app.decorate('prisma', prisma);
  app.setErrorHandler((error, _request, reply) => {
    reply.code(error instanceof AppError ? error.statusCode : 500).send({ mensagem: error.message });
  });
  await app.register(jwtPlugin);
  await app.register(userRoutes, { prefix: '/api' });
  await app.register(productionRoutes, { prefix: '/api' });
  app.get('/api/auth/me', { preHandler: [app.authenticate] }, async () => ({ ok: true }));
  await app.ready();
});
afterEach(() => app.close());

const headers = (sub = 'admin') => ({ authorization: `Bearer ${app.jwt.sign({ sub })}` });
const patch = (payload: unknown, actor = 'admin', target = 'target') => app.inject({
  method: 'PATCH', url: `/api/users/${target}/role`, headers: headers(actor), payload,
});

it('converts in both directions, returns safe data and preserves unrelated account data', async () => {
  const original = { ...state.users.target };
  state.users.target.role = 'LEADER';
  let response = await patch({ role: 'USER', production: true });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().dados.user.production, true);
  assert.equal(response.json().dados.user.role, 'USER');
  assert.equal(response.json().dados.user.passwordHash, undefined);
  assert.match(response.json().mensagem, /Função e acesso/);
  assert.deepEqual(state.users.target, { ...original, production: true });
  assert.equal(state.sessions.some((s) => s.userId === 'target'), false);
  assert.ok(state.tokens[0].revokedAt instanceof Date);
  assert.equal(state.tokens[1].revokedAt, null);
  assert.equal(state.sessions.some((s) => s.userId === 'other'), true);
  response = await patch({ role: 'LEADER', production: false });
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(state.users.target, { ...original, role: 'LEADER' });
  assert.equal(revocations, 2);
  const list = await app.inject({ url: '/api/users', headers: headers() });
  assert.equal(list.json().dados.users.find((u: User) => u.id === 'target').production, false);
});

it('preserves omitted production and does not revoke sessions for unchanged status', async () => {
  assert.equal((await patch({ role: 'LEADER' })).statusCode, 200);
  assert.equal(state.users.target.production, false);
  assert.equal((await patch({ role: 'USER', production: false })).statusCode, 200);
  state.users.target.production = true;
  assert.equal((await patch({ role: 'USER' })).statusCode, 200);
  assert.equal(state.users.target.production, true);
  assert.equal((await patch({ role: 'USER', production: true })).statusCode, 200);
  assert.equal(revocations, 0);
  assert.equal(state.sessions.length, 2);
  assert.equal(state.tokens[0].revokedAt, null);
});

it('rejects invalid payloads and final production/role combinations before writing', async () => {
  for (const payload of [{}, { production: true }, { role: 'INVALID' },
    { role: 'USER', production: 'true' }, { role: 'USER', production: null },
    { role: 'ADMIN', production: true }, { role: 'LEADER', production: true }]) {
    assert.equal((await patch(payload)).statusCode, 400, JSON.stringify(payload));
  }
  state.users.target.production = true;
  assert.equal((await patch({ role: 'LEADER' })).statusCode, 400);
  assert.equal(transactions, 0);
});

it('preserves actor, team-management, administrator and active-target restrictions', async () => {
  assert.equal((await patch({ role: 'USER', production: true }, 'other')).statusCode, 403);
  assert.equal((await patch({ role: 'USER', production: true }, 'leader', 'admin')).statusCode, 403);
  assert.equal((await patch({ role: 'ADMIN', production: false }, 'leader')).statusCode, 403);
  canManage = false;
  assert.equal((await patch({ role: 'USER', production: true }, 'leader')).statusCode, 403);
  canManage = true;
  state.users.target.active = false;
  assert.equal((await patch({ role: 'USER', production: true })).statusCode, 400);
  assert.equal((await patch({ role: 'USER' }, 'admin', 'missing')).statusCode, 404);
  assert.equal(transactions, 0);
  state.users.target.active = true;
  assert.equal((await patch({ role: 'USER', production: true }, 'leader')).statusCode, 200);
});

it('prevents the last administrator from converting their own account', async () => {
  const response = await patch({ role: 'USER', production: true }, 'admin', 'admin');
  assert.equal(response.statusCode, 400);
  assert.match(response.json().mensagem, /administrador/i);
  assert.equal(transactions, 0);
  state.users.other.role = 'ADMIN';
  assert.equal((await patch({ role: 'USER', production: true }, 'admin', 'admin')).statusCode, 200);
});

it('rolls back the role, production flag and session deletion if revocation fails', async () => {
  const before = structuredClone(state);
  failRevocation = true;
  assert.equal((await patch({ role: 'USER', production: true })).statusCode, 503);
  assert.equal(transactions, 1);
  assert.equal(revocations, 1);
  assert.deepEqual(state, before);
});

it('switches login flows and rejects previous sessions and refresh tokens after conversion', async () => {
  const auth = new AuthService(new UserRepository(prisma), new RefreshTokenRepository(prisma),
    { getCurrentPeriod: async () => null } as unknown as AbsenceService,
    { getCurrentByUserId: async () => null } as unknown as ShiftService);
  const credentials = { cardNumber: 'target', unit: 'TRACTOR' as const, password };
  const productionLogin = () => app.inject({ method: 'POST', url: '/api/production/login',
    payload: { cardNumber: 'target', unit: 'TRACTOR' } });
  assert.equal((await auth.login(credentials)).production, false);
  assert.equal((await productionLogin()).statusCode, 401);
  const ordinaryHeaders = headers('target');
  await patch({ role: 'USER', production: true });
  await assert.rejects(auth.login(credentials), (e: any) => e.statusCode === 401);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: ordinaryHeaders })).statusCode, 401);
  const login = await productionLogin();
  assert.equal(login.statusCode, 200);
  const productionHeaders = { authorization: `Bearer ${login.json().dados.token}` };
  assert.equal((await app.inject({ url: '/api/auth/me', headers: productionHeaders })).statusCode, 200);
  await patch({ role: 'USER', production: false });
  assert.equal((await productionLogin()).statusCode, 401);
  assert.equal((await auth.login(credentials)).production, false);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: productionHeaders })).statusCode, 401);
  await assert.rejects(auth.rotateRefreshToken(refreshToken), (e: any) => e.statusCode === 401);
  await patch({ role: 'USER', production: true });
  assert.equal((await app.inject({ url: '/api/auth/me', headers: productionHeaders })).statusCode, 401);
});

import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { it } from 'node:test';
import bcrypt from 'bcryptjs';
import Fastify from 'fastify';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client.js';
import type { AccountMail } from '../lib/account-mailer.js';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ??= 'account-postgres-tests-secret-at-least-32-characters';
process.env.DEFAULT_PASSWORD ??= 'test-default-password';
process.env.API_BASE_KEY ??= 'test';
process.env.API_BASE_NAME_APPLICATION ??= 'test';
const { AccountService } = await import('./account.service.js');
const { UserRepository } = await import('../repositories/user.repository.js');
const { accountRoutes } = await import('../routes/account.route.js');
const { authRoutes } = await import('../routes/auth.route.js');
const { jwtPlugin } = await import('../plugins/jwt.plugin.js');
const { AppError } = await import('../utils/errors.js');
const url = process.env.KAIRO_ACCOUNT_TEST_DATABASE_URL;

it('profile and recovery against isolated PostgreSQL', { skip: !url }, async (t) => {
  assert.match(new URL(url!).pathname, /_test$/, 'Only an isolated database ending in _test is allowed');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const users = new UserRepository(prisma);
  const mails: AccountMail[] = [];
  let failDelivery = false;
  const mailer = async (mail: AccountMail) => {
    if (failDelivery) throw new Error('Simulated SMTP outage');
    mails.push(mail);
  };
  const service = new AccountService(prisma, mailer);
  const app = Fastify();
  app.decorate('prisma', prisma);
  app.setErrorHandler((error, _request, reply) => reply.code(error instanceof AppError ? error.statusCode : 500).send({ mensagem: error.message }));
  await app.register(jwtPlugin);
  await app.register(accountRoutes, { prefix: '/api', mailer });
  await app.register(authRoutes, { prefix: '/api' });
  await app.ready();
  let ipSequence = 1;
  const passwordHash = await bcrypt.hash('original-password', 4);
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const lastToken = () => {
    const mail = mails.filter((mail) => mail.text.includes('#token=')).at(-1)!;
    return new URLSearchParams(new URL(mail.text.match(/https?:\/\/[^\s]+/)![0]).hash.slice(1)).get('token')!;
  };
  const ageSends = (userId: string) => prisma.accountActionToken.updateMany({
    where: { userId }, data: { createdAt: new Date(Date.now() - 61_000) },
  });
  async function fixture(run: (f: {
    id: string; email: string; cardNumber: string;
    request: (method: 'GET' | 'POST' | 'PATCH', path: string, payload?: Record<string, unknown>) => ReturnType<typeof app.inject>;
  }) => Promise<void>) {
    const id = randomUUID();
    const user = await users.create({ employeeId: id, cardNumber: id, name: 'Account test', role: 'USER', unit: 'TRACTOR', passwordHash });
    await prisma.user.update({ where: { id: user.id }, data: { firstLogin: false } });
    const token = app.jwt.sign({ sub: user.id, authVersion: 0 });
    const ip = `10.0.0.${ipSequence++}`;
    const f = {
      id: user.id, email: `${id}@example.com`, cardNumber: id,
      request: (method: 'GET' | 'POST' | 'PATCH', path: string, payload?: Record<string, unknown>) => app.inject({
        method, url: `/api${path}`, payload, remoteAddress: ip, headers: { authorization: `Bearer ${token}` },
      }),
    };
    failDelivery = false;
    mails.length = 0;
    try { await run(f); }
    finally { failDelivery = false; await prisma.user.delete({ where: { id: user.id } }); }
  }
  const confirmed = (id: string, email: string) => prisma.userEmail.update({ where: { userId: id }, data: { email, verifiedAt: new Date() } });

  try {
    await t.test('creates an optional contact, normalizes email and confirms only on explicit POST', () => fixture(async (f) => {
      assert.deepEqual((await f.request('GET', '/auth/me/profile')).json().dados.profile, { email: null, verifiedAt: null, pendingEmail: null });
      const response = await f.request('PATCH', '/auth/me/profile', { email: ` ${f.email.toUpperCase()} ` });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.json().dados.profile.email, null);
      assert.equal(response.json().dados.profile.pendingEmail, f.email);
      const token = lastToken();
      assert.equal((await prisma.accountActionToken.findUniqueOrThrow({ where: { tokenHash: hash(token) } })).purpose, 'EMAIL_VERIFICATION');
      assert.ok(!JSON.stringify(response.json()).includes(token));
      assert.equal((await f.request('GET', '/auth/verify-email')).statusCode, 404);
      assert.equal((await service.getProfile(f.id)).email, null);
      assert.equal((await f.request('POST', '/auth/verify-email', { token })).statusCode, 200);
      assert.ok((await service.getProfile(f.id)).verifiedAt);
      assert.equal((await service.getProfile(f.id)).email, f.email);
      assert.equal((await f.request('POST', '/auth/verify-email', { token })).statusCode, 400);
    }));

    await t.test('only missing email directs to automation; nonexistent, inactive and production accounts send nothing', () => fixture(async (f) => {
      const input = { cardNumber: f.cardNumber, unit: 'TRACTOR' };
      const missing = await f.request('POST', '/auth/forgot-password', input);
      assert.equal(missing.json().dados.status, 'no_email');
      assert.match(missing.json().mensagem, /equipe de automação/);
      assert.equal((await f.request('POST', '/auth/forgot-password', { ...input, cardNumber: 'does-not-exist' })).json().dados.status, 'sent');
      await prisma.user.update({ where: { id: f.id }, data: { active: false } });
      assert.equal((await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' })).status, 'sent');
      await prisma.user.update({ where: { id: f.id }, data: { active: true, production: true } });
      assert.equal((await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' })).status, 'sent');
      await assert.rejects(service.getProfile(f.id), (error: unknown) => error instanceof AppError && error.statusCode === 403);
      assert.equal(mails.length, 0);
    }));

    await t.test('pending recovery resends verification and supersedes the previous verification link', () => fixture(async (f) => {
      await service.updateEmail(f.id, f.email);
      const previous = lastToken();
      await ageSends(f.id);
      const response = await f.request('POST', '/auth/forgot-password', { cardNumber: f.cardNumber, unit: 'TRACTOR' });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().dados.status, 'verification_pending');
      assert.ok(!response.json().mensagem.includes('equipe de automação'));
      const current = lastToken();
      await assert.rejects(service.verifyEmail(previous));
      await service.verifyEmail(current);
      assert.equal((await service.getProfile(f.id)).email, f.email);
    }));

    await t.test('replacement keeps the confirmed address until confirmation and then invalidates old reset links', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      const resetToken = lastToken();
      await ageSends(f.id);
      const next = `new-${f.email}`;
      const profile = await service.updateEmail(f.id, next);
      assert.equal(profile.email, f.email);
      assert.equal(profile.pendingEmail, next);
      const verification = lastToken();
      await ageSends(f.id);
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      assert.equal(mails.at(-1)?.to, f.email);
      await service.verifyEmail(verification);
      await assert.rejects(service.resetPassword({ token: resetToken, newPassword: 'replacement-password' }));
      assert.equal((await service.getProfile(f.id)).email, next);
    }));

    await t.test('SMTP failure preserves pending address, invalidates the failed token and supports resend', () => fixture(async (f) => {
      failDelivery = true;
      const response = await f.request('PATCH', '/auth/me/profile', { email: f.email });
      assert.equal(response.statusCode, 503);
      assert.equal((await service.getProfile(f.id)).pendingEmail, f.email);
      assert.equal(await prisma.accountActionToken.count({ where: { userId: f.id, usedAt: null } }), 0);
      failDelivery = false;
      await ageSends(f.id);
      await service.resendVerification(f.id);
      await service.verifyEmail(lastToken());
      assert.equal((await service.getProfile(f.id)).email, f.email);
    }));

    await t.test('simultaneous sends respect the per-account cooldown across service instances', () => fixture(async (f) => {
      const other = new AccountService(prisma, mailer);
      const results = await Promise.allSettled([service.updateEmail(f.id, f.email), other.updateEmail(f.id, f.email)]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(mails.length, 1);
      await assert.rejects(service.resendVerification(f.id), (error: unknown) => error instanceof AppError && error.statusCode === 429);
    }));

    await t.test('hourly limit survives expired, consumed or invalidated links', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      for (let index = 0; index < 5; index++) {
        await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
        await ageSends(f.id);
      }
      await assert.rejects(service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' }), (error: unknown) => error instanceof AppError && error.statusCode === 429);
      assert.equal(mails.length, 5);
    }));

    await t.test('expired and wrong-purpose links cannot change an email or password', () => fixture(async (f) => {
      await service.updateEmail(f.id, f.email);
      const token = lastToken();
      await assert.rejects(service.resetPassword({ token, newPassword: 'replacement-password' }));
      await prisma.accountActionToken.updateMany({ where: { userId: f.id }, data: { expiresAt: new Date(Date.now() - 1) } });
      await assert.rejects(service.verifyEmail(token));
      assert.equal((await service.getProfile(f.id)).email, null);
    }));

    await t.test('removing an address invalidates both verification and recovery links', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      const token = lastToken();
      await ageSends(f.id);
      await service.updateEmail(f.id, `new-${f.email}`);
      const verification = lastToken();
      assert.deepEqual(await service.updateEmail(f.id, null), { email: null, verifiedAt: null, pendingEmail: null });
      await assert.rejects(service.resetPassword({ token, newPassword: 'replacement-password' }));
      await assert.rejects(service.verifyEmail(verification));
      assert.equal((await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' })).status, 'no_email');
    }));

    await t.test('reset consumes once, revokes JWTs and refresh tokens, ends first login and permits only the new password', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      await prisma.user.update({ where: { id: f.id }, data: { firstLogin: true } });
      const refresh = randomBytes(32).toString('base64url');
      await prisma.refreshToken.create({ data: { userId: f.id, tokenHash: hash(refresh), authVersion: 0, expiresAt: new Date(Date.now() + 60_000) } });
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      const token = lastToken();
      const mismatch = await f.request('POST', '/auth/reset-password', { token, newPassword: 'new-password', confirmPassword: 'wrong' });
      assert.equal(mismatch.statusCode, 400);
      const defaultPassword = await f.request('POST', '/auth/reset-password', { token, newPassword: process.env.DEFAULT_PASSWORD, confirmPassword: process.env.DEFAULT_PASSWORD });
      assert.equal(defaultPassword.statusCode, 400);
      const response = await f.request('POST', '/auth/reset-password', { token, newPassword: 'new-password', confirmPassword: 'new-password' });
      assert.equal(response.statusCode, 200, response.body);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: f.id } });
      assert.equal(user.firstLogin, false);
      assert.equal(user.authVersion, 1);
      assert.ok(await bcrypt.compare('new-password', user.passwordHash));
      assert.equal((await f.request('GET', '/auth/me/profile')).statusCode, 401);
      assert.equal((await f.request('POST', '/auth/refresh', { refreshToken: refresh })).statusCode, 401);
      assert.equal((await f.request('POST', '/auth/reset-password', { token, newPassword: 'another-password', confirmPassword: 'another-password' })).statusCode, 400);
      const login = await f.request('POST', '/auth/login', { cardNumber: f.cardNumber, unit: 'TRACTOR', password: 'new-password' });
      assert.equal(login.statusCode, 200, login.body);
      assert.equal(app.jwt.decode<{ authVersion: number }>(login.json().dados.token)?.authVersion, 1);
      assert.equal((await f.request('POST', '/auth/login', { cardNumber: f.cardNumber, unit: 'TRACTOR', password: 'original-password' })).statusCode, 401);
      assert.match(mails.at(-1)!.subject, /foi redefinida/);
    }));

    await t.test('two concurrent reset submissions commit exactly one password change', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      const token = lastToken();
      const other = new AccountService(prisma, mailer);
      const results = await Promise.allSettled([
        service.resetPassword({ token, newPassword: 'first-new-password' }),
        other.resetPassword({ token, newPassword: 'second-new-password' }),
      ]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: f.id } })).authVersion, 1);
    }));

    await t.test('a database failure rolls back token consumption, password and version changes', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      const token = lastToken();
      const failing = prisma.$extends({ query: { refreshToken: { async updateMany() { throw new Error('Injected revocation failure'); } } } });
      const broken = new AccountService(failing as unknown as PrismaClient, mailer);
      await assert.rejects(broken.resetPassword({ token, newPassword: 'not-committed' }));
      const user = await prisma.user.findUniqueOrThrow({ where: { id: f.id } });
      assert.equal(user.authVersion, 0);
      assert.equal(user.passwordHash, passwordHash);
      assert.equal((await prisma.accountActionToken.findUniqueOrThrow({ where: { tokenHash: hash(token) } })).usedAt, null);
      await service.resetPassword({ token, newPassword: 'committed-password' });
    }));

    await t.test('administrative reset invalidates pending links and legacy JWTs without losing contact', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      const token = lastToken();
      await users.resetPassword(f.id, await bcrypt.hash('admin-reset-password', 4));
      assert.equal((await f.request('GET', '/auth/me/profile')).statusCode, 401);
      await assert.rejects(service.resetPassword({ token, newPassword: 'not-allowed' }));
      assert.equal((await service.getProfile(f.id)).email, f.email);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: f.id } })).firstLogin, true);
    }));

    await t.test('type changes preserve contact and invalidate previous links and ordinary sessions', () => fixture(async (f) => {
      await confirmed(f.id, f.email);
      await service.forgotPassword({ cardNumber: f.cardNumber, unit: 'TRACTOR' });
      const token = lastToken();
      await users.updateRole(f.id, { role: 'USER', production: true });
      await assert.rejects(service.getProfile(f.id));
      assert.equal((await f.request('GET', '/auth/me/profile')).statusCode, 401);
      await users.updateRole(f.id, { role: 'USER', production: false });
      assert.equal((await f.request('GET', '/auth/me/profile')).statusCode, 401);
      await assert.rejects(service.resetPassword({ token, newPassword: 'not-allowed' }));
      assert.equal((await service.getProfile(f.id)).email, f.email);
    }));

    await t.test('a stale refresh token created after a reset still cannot restore access', () => fixture(async (f) => {
      await users.resetPassword(f.id, passwordHash);
      const refresh = randomBytes(32).toString('base64url');
      await prisma.refreshToken.create({ data: { userId: f.id, tokenHash: hash(refresh), authVersion: 0, expiresAt: new Date(Date.now() + 60_000) } });
      assert.equal((await f.request('POST', '/auth/refresh', { refreshToken: refresh })).statusCode, 401);
    }));

    await t.test('the existing first-login password flow issues the new credential version', () => fixture(async (f) => {
      await prisma.user.update({ where: { id: f.id }, data: { firstLogin: true } });
      const login = await f.request('POST', '/auth/login', { cardNumber: f.cardNumber, unit: 'TRACTOR', password: 'original-password' });
      assert.equal(login.statusCode, 200, login.body);
      assert.equal(login.json().dados.requiresPasswordChange, true);
      assert.equal(login.json().dados.token, undefined);
      const changed = await f.request('POST', '/auth/change-password', {
        cardNumber: f.cardNumber, unit: 'TRACTOR', currentPassword: 'original-password',
        newPassword: 'personal-first-password', confirmPassword: 'personal-first-password',
      });
      assert.equal(changed.statusCode, 200, changed.body);
      assert.equal(app.jwt.decode<{ authVersion: number }>(changed.json().dados.token)?.authVersion, 1);
      const refresh = await f.request('POST', '/auth/refresh', { refreshToken: changed.json().dados.refreshToken });
      assert.equal(refresh.statusCode, 200, refresh.body);
      assert.equal(app.jwt.decode<{ authVersion: number }>(refresh.json().dados.token)?.authVersion, 1);
    }));
  } finally { await app.close(); await prisma.$disconnect(); }
});

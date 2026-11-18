import assert from 'node:assert/strict';
import { it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ??= 'account-tests-secret-at-least-32-characters';
process.env.DEFAULT_PASSWORD ??= 'test-password';
process.env.API_BASE_KEY ??= 'test';
process.env.API_BASE_NAME_APPLICATION ??= 'test';

const { updateProfileSchema, forgotPasswordSchema, actionTokenSchema, resetPasswordSchema } = await import('../schemas/account.schema.js');
const { accountMail } = await import('../lib/account-mailer.js');
const { accountRoutes } = await import('../routes/account.route.js');
const { AppError } = await import('../utils/errors.js');
const { default: Fastify } = await import('fastify');

it('normalizes optional emails and rejects invalid or extra profile fields', () => {
  assert.deepEqual(updateProfileSchema.parse({ email: ' User@Example.COM  ' }), { email: 'user@example.com' });
  assert.deepEqual(updateProfileSchema.parse({ email: null }), { email: null });
  for (const input of [{}, { email: '' }, { email: 'invalid' }, { email: 10 }, { email: null, userId: 'someone-else' }]) {
    assert.equal(updateProfileSchema.safeParse(input).success, false);
  }
});

it('recovery uses only card and unit and validates action tokens and confirmation', () => {
  assert.deepEqual(forgotPasswordSchema.parse({ cardNumber: ' 123 ', unit: 'TRACTOR' }), { cardNumber: '123', unit: 'TRACTOR' });
  assert.equal(forgotPasswordSchema.safeParse({ email: 'someone@example.com' }).success, false);
  assert.equal(actionTokenSchema.safeParse({ token: 'bad' }).success, false);
  assert.equal(actionTokenSchema.safeParse({ token: 'a'.repeat(43) }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ token: 'a'.repeat(43), newPassword: 'new', confirmPassword: 'different' }).success, false);
});

it('email templates escape untrusted names, include a text alternative and keep the token in a fragment', () => {
  const mail = accountMail('a@example.com', '<img src=x onerror=alert(1)>', 'Confirmar', 'Texto seguro.', { label: 'Confirmar', url: 'https://kairo.example/confirmar-email#token=abc' });
  assert.ok(!mail.html.includes('<img'));
  assert.match(mail.html, /&lt;img/);
  assert.match(mail.text, /https:\/\/kairo.example\/confirmar-email#token=abc/);
});

it('public routes validate before database access; profile requires authentication; IP attempts are bounded', async () => {
  const app = Fastify();
  app.decorate('prisma', {});
  app.decorate('authenticate', async () => { throw new AppError(401, 'Não autorizado'); });
  app.setErrorHandler((error, _request, reply) => reply.code(error instanceof AppError ? error.statusCode : error.statusCode ?? 500).send({ mensagem: error.message }));
  await app.register(accountRoutes, { prefix: '/api', mailer: async () => assert.fail('No email should be sent') });
  try {
    assert.equal((await app.inject('/api/auth/me/profile')).statusCode, 401);
    assert.equal((await app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token: 'a'.repeat(43), newPassword: 'x'.repeat(9000), confirmPassword: 'x'.repeat(9000) } })).statusCode, 413);
    for (let index = 0; index < 20; index++) {
      const response = await app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token: 'invalid' } });
      assert.equal(response.statusCode, 400);
    }
    const limited = await app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token: 'invalid' } });
    assert.equal(limited.statusCode, 429);
    assert.ok(limited.headers['retry-after']);
  } finally { await app.close(); }
});

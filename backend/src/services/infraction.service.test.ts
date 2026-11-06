import assert from 'node:assert/strict';
import { after, before, it, mock } from 'node:test';
import { spawnSync } from 'node:child_process';
import Fastify from 'fastify';
import type { PrismaClient } from '../generated/client.js';
import { AppError } from '../utils/errors.js';

Object.assign(process.env, {
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  JWT_SECRET: 'infraction-tests-secret-at-least-32-characters',
  DEFAULT_PASSWORD: 'test', API_BASE_KEY: 'test', API_BASE_NAME_APPLICATION: 'test',
  P5_INFRACTIONS_API_URL: 'http://p5.test/api/p5/integrations/kairo/infractions',
  P5_INFRACTIONS_API_KEY: 'test-key-with-#$&',
});
const { InfractionService } = await import('./infraction.service.js');
const { infractionRoutes } = await import('../routes/infraction.route.js');
const { jwtPlugin } = await import('../plugins/jwt.plugin.js');

const query = { month: 10, year: 2026 };
const config = {
  P5_INFRACTIONS_API_URL: process.env.P5_INFRACTIONS_API_URL,
  P5_INFRACTIONS_API_KEY: process.env.P5_INFRACTIONS_API_KEY,
};
const report = {
  ...query, totalPeople: 1, totalInfractions: 3,
  people: [{
    name: 'Ana Exemplo', cardNumber: '1234', unit: 'TRACTOR',
    monthlyAverage: { percent: 54.16666667, loggedSeconds: 50400, workedSeconds: 86400 },
    infractionCount: 3,
    infractions: [
      { date: '2026-10-01', type: 'EXCESS', workedSeconds: 28800, loggedSeconds: 32400, percent: 112.5 },
      { date: '2026-10-02', type: 'BELOW_70', workedSeconds: 28800, loggedSeconds: 18000, percent: 62.5 },
      { date: '2026-10-03', type: 'NONE', workedSeconds: 28800, loggedSeconds: 0, percent: 0 },
    ],
  }],
};
let requests = 0;
let lastUrl: URL | undefined;
let lastOptions: RequestInit | undefined;
const app = Fastify();
const users = {
  admin: { id: 'admin', active: true, role: 'ADMIN', production: false },
  leader: { id: 'leader', active: true, role: 'LEADER', production: false },
  user: { id: 'user', active: true, role: 'USER', production: false },
  inactive: { id: 'inactive', active: false, role: 'ADMIN', production: false },
};
app.decorate('prisma', {
  user: {
    findUnique: async ({ where }: { where: { id: keyof typeof users } }) => users[where.id] ?? null,
    findMany: async (options: any) => {
      assert.deepEqual(options.where, { role: 'LEADER', active: true });
      assert.deepEqual(options.select.memberships.where, { role: 'ADMIN', team: { active: true } });
      assert.deepEqual(options.select.memberships.select.team.select.members.where, { user: { active: true } });
      const tractor = { user: { unit: 'TRACTOR', cardNumber: '1234' } };
      return [{ id: 'leader', name: 'Líder Teste', memberships: [
        { team: { members: [tractor, { user: { unit: 'PEDERTRACTOR', cardNumber: '1234' } }] } },
        { team: { members: [tractor] } },
      ] }, { id: 'empty-leader', name: 'Sem equipe', memberships: [] }];
    },
  },
} as unknown as PrismaClient);
app.setErrorHandler((error, _request, reply) => {
  reply.code(error instanceof AppError ? error.statusCode : 500).send({ mensagem: error.message });
});

before(async () => {
  mock.method(globalThis, 'fetch', async (url: URL, options: RequestInit) => {
    requests++;
    lastUrl = new URL(url);
    lastOptions = options;
    return Response.json(report);
  });
  await app.register(jwtPlugin);
  await app.register(infractionRoutes, { prefix: '/api' });
  await app.ready();
});
after(async () => { await app.close(); mock.restoreAll(); });
const headers = (sub: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub })}` });
const isStatus = (status: number) => (error: unknown) => error instanceof AppError && error.statusCode === status;

it('requires authentication and an active global administrator before contacting P5', async () => {
  const count = requests;
  assert.equal((await app.inject({ url: '/api/infractions?month=10&year=2026' })).statusCode, 401);
  for (const [sub, status] of [['user', 403], ['leader', 403], ['inactive', 401], ['missing', 401]] as const) {
    const response = await app.inject({ url: '/api/infractions?month=10&year=2026', headers: headers(sub) });
    assert.equal(response.statusCode, status);
    assert.equal(typeof response.json().mensagem, 'string');
  }
  assert.equal(requests, count);
});

it('validates required integer month and year without contacting P5', async () => {
  const count = requests;
  for (const params of ['', '?month=10', '?year=2026', '?month=0&year=2026', '?month=13&year=2026',
    '?month=1.5&year=2026', '?month=10&year=0', '?month=10&year=-1', '?month=10&year=2.5',
    '?month=abc&year=2026', '?month=10&year=', '?month=1&month=2&year=2026']) {
    const response = await app.inject({ url: `/api/infractions${params}`, headers: headers('admin') });
    assert.equal(response.statusCode, 400, params);
    assert.match(response.json().mensagem, /mês.*ano/);
  }
  assert.equal(requests, count);
});

it('restricts leader metadata to administrators and deduplicates members by unit and card without contacting P5', async () => {
  const count = requests;
  assert.equal((await app.inject({ url: '/api/infractions/leaders' })).statusCode, 401);
  for (const [sub, status] of [['user', 403], ['leader', 403], ['inactive', 401]] as const) {
    assert.equal((await app.inject({ url: '/api/infractions/leaders', headers: headers(sub) })).statusCode, status);
  }
  const response = await app.inject({ url: '/api/infractions/leaders', headers: headers('admin') });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().dados.leaders, [
    { id: 'leader', name: 'Líder Teste', members: [{ unit: 'TRACTOR', cardNumber: '1234' }, { unit: 'PEDERTRACTOR', cardNumber: '1234' }] },
    { id: 'empty-leader', name: 'Sem equipe', members: [] },
  ]);
  assert.equal(requests, count);
});

it('returns the supplied contract in dados and sends filters and the dedicated key only to P5', async () => {
  const response = await app.inject({ url: '/api/infractions?month=10&year=2026', headers: headers('admin') });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { dados: report });
  assert.equal(lastUrl?.pathname, '/api/p5/integrations/kairo/infractions');
  assert.equal(lastUrl?.searchParams.get('month'), '10');
  assert.equal(lastUrl?.searchParams.get('year'), '2026');
  assert.equal(new Headers(lastOptions?.headers).get('X-Kairo-API-Key'), config.P5_INFRACTIONS_API_KEY);
  assert.equal(new Headers(lastOptions?.headers).get('Authorization'), null);
  assert.equal(lastOptions?.redirect, 'error');
  assert.ok(lastOptions?.signal instanceof AbortSignal);
  assert.ok(!response.body.includes(config.P5_INFRACTIONS_API_KEY!));
});

it('preserves P5 totals, zero values, unknown types and people without local accounts', async () => {
  const data = structuredClone(report);
  data.totalPeople = 2;
  data.totalInfractions = 17;
  data.people.push({ ...structuredClone(data.people[0]), unit: 'PEDERTRACTOR' });
  data.people[1].infractions[0].type = 'NEW_TYPE';
  const service = new InfractionService(config, async () => Response.json(data));
  assert.deepEqual(await service.getReport(query), data);
});

it('preserves an unavailable monthly average returned as null by P5', async () => {
  const data = { ...report, people: [{ ...report.people[0], monthlyAverage: {
    percent: null, loggedSeconds: 0, workedSeconds: 0,
  } }] };
  assert.deepEqual(await new InfractionService(config, async () => Response.json(data)).getReport(query), data);
});

it('returns an empty period without inventing data', async () => {
  const data = { ...query, totalPeople: 0, totalInfractions: 0, people: [] };
  assert.deepEqual(await new InfractionService(config, async () => Response.json(data)).getReport(query), data);
});

it('reports missing configuration without making requests', async () => {
  const request: typeof fetch = async () => { assert.fail('must not call P5'); };
  for (const settings of [{}, { P5_INFRACTIONS_API_URL: config.P5_INFRACTIONS_API_URL }, { P5_INFRACTIONS_API_KEY: config.P5_INFRACTIONS_API_KEY }]) {
    await assert.rejects(new InfractionService(settings, request).getReport(query), isStatus(503));
  }
});

it('maps external HTTP and network errors without exposing the upstream body or credentials', async () => {
  for (const status of [401, 403, 404, 429, 500, 503]) {
    const service = new InfractionService(config, async () => new Response('private upstream error', { status }));
    await assert.rejects(service.getReport(query), (error: unknown) => isStatus(502)(error) &&
      error instanceof Error && !error.message.includes('private') && !error.message.includes(config.P5_INFRACTIONS_API_KEY!));
  }
  await assert.rejects(new InfractionService(config, async () => { throw new TypeError('network failed'); }).getReport(query), isStatus(502));
});

it('rejects malformed JSON, invalid contracts and responses for another period', async () => {
  const responses = [
    new Response('<html>not JSON</html>'),
    Response.json(null), Response.json({ ...report, people: null }),
    Response.json({ ...report, month: 9 }), Response.json({ ...report, year: 2025 }),
    Response.json({ ...report, totalInfractions: -1 }),
  ];
  for (const response of responses) {
    await assert.rejects(new InfractionService(config, async () => response).getReport(query), (error: unknown) =>
      isStatus(502)(error) && error instanceof Error && error.message.includes('inválida'));
  }
});

it('bounds the request and response body by the timeout', async () => {
  const waitForTimeout = async (signal: AbortSignal) => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    signal.throwIfAborted();
  };
  const delayedFetch: typeof fetch = async (_url, options) => {
    await waitForTimeout(options!.signal!);
    return Response.json(report);
  };
  await assert.rejects(new InfractionService(config, delayedFetch, 5).getReport(query), isStatus(504));
  const delayedBody: typeof fetch = async (_url, options) => ({
    ok: true,
    json: async () => { await waitForTimeout(options!.signal!); return report; },
  } as Response);
  await assert.rejects(new InfractionService(config, delayedBody, 5).getReport(query), isStatus(504));
});

it('accepts both P5 variables absent or configured together, and rejects incomplete or invalid configuration', () => {
  const base = { ...process.env };
  delete base.P5_INFRACTIONS_API_URL;
  delete base.P5_INFRACTIONS_API_KEY;
  for (const [settings, success] of [
    [{}, true], [config, true],
    [{ P5_INFRACTIONS_API_URL: config.P5_INFRACTIONS_API_URL }, false],
    [{ P5_INFRACTIONS_API_KEY: config.P5_INFRACTIONS_API_KEY }, false],
    [{ ...config, P5_INFRACTIONS_API_URL: 'not-a-url' }, false],
  ] as const) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', "await import('./src/config/env.ts')"], {
      env: { ...base, ...settings }, encoding: 'utf8', timeout: 15_000,
    });
    assert.equal(result.status === 0, success, result.stderr);
  }
});

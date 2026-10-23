import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { afterEach, describe, it, mock } from 'node:test';
import { deliverSolicitationWebhook, notifySolicitationCardChanged } from './solicitation-webhook.js';

const card = { id: 'card-1', teamId: 'team-1', integrationSource: 'solicitacao-eng-mecanica' };
const config = { url: 'http://solicitation.test/api/webhooks/kairo', secret: 'test-secret-at-least-32-characters' };

describe('Solicitation webhook delivery', () => {
  it('signs the payload and includes the affected team and card', async () => {
    let calls = 0;
    await deliverSolicitationWebhook(card, { ...config, fetch: async (url, init) => {
      calls += 1;
      assert.equal(url, config.url);
      assert.equal(init?.method, 'POST');
      assert.equal(init?.redirect, 'error');
      const body = String(init?.body);
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers['X-Kairo-Signature'], createHmac('sha256', config.secret)
        .update(`${headers['X-Kairo-Timestamp']}.${body}`).digest('hex'));
      assert.deepEqual(JSON.parse(body), { eventId: JSON.parse(body).eventId, type: 'card.updated', teamId: 'team-1', cardId: 'card-1' });
      assert.ok(init?.signal);
      return new Response(null, { status: 200 });
    } });
    assert.equal(calls, 1);
  });
  it('retries temporary HTTP and network failures with the same event ID', async () => {
    const bodies: string[] = [];
    const waits: number[] = [];
    await deliverSolicitationWebhook(card, { ...config,
      wait: async (ms) => { waits.push(ms); },
      fetch: async (_url, init) => {
        bodies.push(String(init?.body));
        if (bodies.length === 1) throw new Error('network offline');
        return new Response(null, { status: bodies.length === 2 ? 503 : 200 });
      },
    });
    assert.equal(bodies.length, 3);
    assert.equal(new Set(bodies).size, 1);
    assert.deepEqual(waits, [1000, 2000]);
  });
  it('stops after three failures and does not retry authentication errors', async () => {
    for (const status of [401, 503]) {
      let calls = 0;
      await assert.rejects(deliverSolicitationWebhook(card, { ...config, wait: async () => {},
        fetch: async () => { calls += 1; return new Response(null, { status }); },
      }));
      assert.equal(calls, status === 401 ? 1 : 3);
    }
  });
});

describe('Solicitation webhook selection', () => {
  const oldUrl = process.env.SOLICITATION_WEBHOOK_URL;
  const oldSecret = process.env.SOLICITATION_WEBHOOK_SECRET;
  afterEach(() => {
    if (oldUrl === undefined) delete process.env.SOLICITATION_WEBHOOK_URL;
    else process.env.SOLICITATION_WEBHOOK_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.SOLICITATION_WEBHOOK_SECRET;
    else process.env.SOLICITATION_WEBHOOK_SECRET = oldSecret;
    mock.restoreAll();
  });
  it('ignores native cards and disabled configurations', () => {
    process.env.SOLICITATION_WEBHOOK_URL = config.url;
    process.env.SOLICITATION_WEBHOOK_SECRET = config.secret;
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response());
    notifySolicitationCardChanged({ ...card, integrationSource: null });
    notifySolicitationCardChanged({ ...card, integrationSource: 'another-system' });
    delete process.env.SOLICITATION_WEBHOOK_SECRET;
    notifySolicitationCardChanged(card);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
  it('dispatches integration cards without waiting for the destination', async () => {
    process.env.SOLICITATION_WEBHOOK_URL = config.url;
    process.env.SOLICITATION_WEBHOOK_SECRET = config.secret;
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response());
    assert.equal(notifySolicitationCardChanged(card), undefined);
    assert.equal(fetchMock.mock.callCount(), 1);
    await new Promise((resolve) => setImmediate(resolve));
  });
});

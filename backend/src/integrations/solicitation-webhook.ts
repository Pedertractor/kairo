import { createHmac, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

type Card = { id: string; teamId: string; integrationSource: string | null };
type Options = {
  url: string;
  secret: string;
  fetch?: typeof fetch;
  wait?: (milliseconds: number) => Promise<unknown>;
};

/** Retries reuse the event ID, but read current state on the receiving side. */
export async function deliverSolicitationWebhook(card: Card, options: Options) {
  const body = JSON.stringify({
    eventId: randomUUID(),
    type: 'card.updated',
    teamId: card.teamId,
    cardId: card.id,
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await (options.wait ?? delay)(attempt * 1_000);
    const timestamp = String(Math.floor(Date.now() / 1_000));
    const signature = createHmac('sha256', options.secret)
      .update(`${timestamp}.${body}`).digest('hex');
    try {
      const response = await (options.fetch ?? fetch)(options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kairo-Timestamp': timestamp,
          'X-Kairo-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
      const status = response.status;
      await response.body?.cancel();
      if (response.ok) return;
      if (status >= 400 && status < 500 && status !== 429) {
        throw new Error(`Webhook recusado (HTTP ${status})`);
      }
      if (attempt === 2) throw new Error(`Webhook indisponível (HTTP ${status})`);
    } catch (error) {
      if (attempt === 2 || (error instanceof Error && error.message.startsWith('Webhook recusado'))) {
        throw error;
      }
    }
  }
}

/** Never block or roll back a Kairo mutation because the destination is down. */
export function notifySolicitationCardChanged(card: Card) {
  const url = process.env.SOLICITATION_WEBHOOK_URL;
  const secret = process.env.SOLICITATION_WEBHOOK_SECRET;
  if (card.integrationSource !== 'solicitacao-eng-mecanica' || !url || !secret) return;
  void deliverSolicitationWebhook(card, { url, secret }).catch(() => {
    // Do not log the URL, credentials or response payload.
    console.error(`[solicitation-webhook] Falha ao notificar card ${card.id}; sincronização periódica permanece disponível.`);
  });
}

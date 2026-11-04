import 'dotenv/config';
import { Client } from 'pg';
import { backfillActivityCompletions, CompletionBackfillError, parseBackfillArguments } from '../services/activity-completion-backfill.js';

let client: Client | undefined;
try {
  const apply = parseBackfillArguments(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');
  const target = new URL(process.env.DATABASE_URL);
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', host: target.hostname, port: target.port, database: target.pathname }));
  client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  await client.connect();
  const report = await backfillActivityCompletions(client, {
    apply,
    onBatch: (proposals, progress) => console.log(JSON.stringify({ proposals, progress })),
  });
  console.log(JSON.stringify({ report }));
} catch (error) {
  if (error instanceof CompletionBackfillError) {
    console.error(JSON.stringify({ report: error.report }));
    console.error(error.message);
    if (error.cause instanceof Error) console.error(error.cause.message);
  } else console.error(error instanceof Error ? error.message : 'Falha inesperada.');
  process.exitCode = 1;
} finally {
  await client?.end();
}

import type { Client } from 'pg';

export const COMPLETION_BACKFILL_LOCK = 741904113;
export const COMPLETION_BACKFILL_BATCH_SIZE = 500;

export interface CompletionProposal {
  id: string;
  originalUpdatedAt: string;
  proposedCompletedAt: string;
  estimated: boolean;
  invalidReason: string | null;
}

export interface CompletionBackfillReport {
  mode: 'apply' | 'dry-run';
  cutoff: string;
  examined: number;
  recovered: number;
  estimated: number;
  ignored: number;
  errors: number;
}

export class CompletionBackfillError extends Error {
  constructor(public readonly report: CompletionBackfillReport, cause: unknown) {
    super('Falha no preenchimento das conclusões; lotes anteriores permanecem confirmados.', { cause });
  }
}

export function parseBackfillArguments(args: string[]): boolean {
  if (args.length === 0 || (args.length === 1 && args[0] === '--dry-run')) return false;
  if (args.length === 1 && args[0] === '--apply') return true;
  throw new Error('Use --dry-run (padrão) ou --apply, sem outros argumentos.');
}

/** A dedicated pg connection is required: the advisory lock lasts for this session. */
export async function backfillActivityCompletions(
  client: Client,
  options: {
    apply?: boolean;
    onBatch?: (rows: CompletionProposal[], report: CompletionBackfillReport) => void;
    batchSize?: number;
  } = {},
): Promise<CompletionBackfillReport> {
  const apply = options.apply ?? false;
  const batchSize = options.batchSize ?? COMPLETION_BACKFILL_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error('Tamanho de lote inválido.');
  }
  const report: CompletionBackfillReport = {
    mode: apply ? 'apply' : 'dry-run', cutoff: '', examined: 0,
    recovered: 0, estimated: 0, ignored: 0, errors: 0,
  };
  let locked = false;
  let transaction = false;
  let cursor = '';
  try {
    if (apply) {
      const lock = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked', [COMPLETION_BACKFILL_LOCK],
      );
      locked = lock.rows[0].locked;
      if (!locked) throw new Error('Outra execução da correção já está em andamento.');
    } else {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      transaction = true;
    }
    // Keep timestamps as PostgreSQL text, avoiding host timezone conversion.
    report.cutoff = (await client.query<{ cutoff: string }>(
      "SELECT (clock_timestamp() AT TIME ZONE 'UTC')::text AS cutoff",
    )).rows[0].cutoff;

    while (true) {
      if (apply) { await client.query('BEGIN'); transaction = true; }
      const result = await client.query<CompletionProposal>(`
        SELECT c.id, c."updatedAt"::text AS "originalUpdatedAt",
          COALESCE(real."createdAt", c."updatedAt")::text AS "proposedCompletedAt",
          (real."createdAt" IS NULL) AS estimated,
          CASE
            WHEN COALESCE(real."createdAt", c."updatedAt") < c."createdAt" THEN 'before_creation'
            WHEN COALESCE(real."createdAt", c."updatedAt") > $1::timestamp THEN 'after_execution_start'
            WHEN real."createdAt" IS NULL AND EXISTS (
              SELECT 1 FROM card_history_events e
              WHERE e."cardId" = c.id AND e.type = 'COMPLETION_ESTIMATED'
            ) THEN 'existing_estimate'
            ELSE NULL END AS "invalidReason"
        FROM cards c
        LEFT JOIN LATERAL (
          SELECT e."createdAt" FROM card_history_events e
          WHERE e."cardId" = c.id AND e.type = 'STATUS_CHANGED' AND e."toStatus" = 'DONE'
          ORDER BY e."createdAt" DESC LIMIT 1
        ) real ON true
        WHERE c.type = 'ACTIVITY' AND c.status = 'DONE'
          AND c."deletedAt" IS NULL AND c."completedAt" IS NULL AND c.id > $2
        ORDER BY c.id LIMIT $3
        ${apply ? 'FOR UPDATE OF c' : ''}
      `, [report.cutoff, cursor, batchSize]);
      if (result.rows.length === 0) {
        if (apply) { await client.query('COMMIT'); transaction = false; }
        break;
      }
      let recovered = 0, estimated = 0, ignored = 0;
      for (const row of result.rows) {
        if (row.invalidReason) { ignored++; continue; }
        if (apply) {
          // Raw SQL intentionally does not update Prisma's @updatedAt column.
          const changed = await client.query(`
            UPDATE cards SET "completedAt" = $2::timestamp, "completionDateEstimated" = $3
            WHERE id = $1 AND type = 'ACTIVITY' AND status = 'DONE'
              AND "deletedAt" IS NULL AND "completedAt" IS NULL
          `, [row.id, row.proposedCompletedAt, row.estimated]);
          if (changed.rowCount !== 1) { ignored++; continue; }
          if (row.estimated) {
            await client.query(`
              INSERT INTO card_history_events
                (id, "cardId", type, "toStatus", "estimatedCompletedAt", "createdAt")
              VALUES (gen_random_uuid()::text, $1, 'COMPLETION_ESTIMATED', 'DONE',
                $2::timestamp, clock_timestamp() AT TIME ZONE 'UTC')
            `, [row.id, row.proposedCompletedAt]);
          }
        }
        if (row.estimated) estimated++; else recovered++;
      }
      if (apply) { await client.query('COMMIT'); transaction = false; }
      report.examined += result.rows.length;
      report.recovered += recovered;
      report.estimated += estimated;
      report.ignored += ignored;
      cursor = result.rows[result.rows.length - 1].id;
      options.onBatch?.(result.rows, { ...report });
    }
    if (transaction) { await client.query('COMMIT'); transaction = false; }
    return report;
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    report.errors++;
    throw new CompletionBackfillError(report, error);
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1)', [COMPLETION_BACKFILL_LOCK]);
  }
}

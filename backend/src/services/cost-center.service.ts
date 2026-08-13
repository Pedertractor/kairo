import { externalApi, ExternalApiError } from '../lib/external-api.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import type { CostCenterSummary } from '../types/cost-center.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

function toCostCenterSummary(item: {
  id: string;
  costCenter: string;
  description: string;
}): CostCenterSummary {
  return {
    id: item.id,
    costCenter: item.costCenter,
    description: item.description,
  };
}

function extractList(body: unknown): unknown[] {
  if (body == null) {
    return [];
  }

  if (Array.isArray(body)) {
    return body;
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;

    for (const key of ['dados', 'data', 'items', 'result']) {
      if (Array.isArray(record[key])) {
        return record[key];
      }
    }
  }

  throw new AppError(502, MENSAGENS.ERRO_API_EXTERNA);
}

function toSyncItem(
  item: unknown,
): { costCenter: string; description: string } | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;

  if (record.STATUS !== true) {
    return null;
  }

  const rawCode = record.CCUSTO;
  let costCenter =
    typeof rawCode === 'string'
      ? rawCode.trim()
      : typeof rawCode === 'number'
        ? String(rawCode)
        : '';

  if (costCenter.startsWith('0')) {
    costCenter = costCenter.slice(1);
  }

  if (!costCenter) {
    return null;
  }

  const description =
    typeof record.DESCRICAO === 'string' ? record.DESCRICAO.trim() : '';

  return { costCenter, description };
}

export class CostCenterService {
  constructor(private readonly costCenterRepository: CostCenterRepository) {}

  async list(): Promise<CostCenterSummary[]> {
    const costCenters = await this.costCenterRepository.findMany();
    return costCenters.map(toCostCenterSummary);
  }

  async syncFromExternal(): Promise<{
    synced: number;
    costCenters: CostCenterSummary[];
  }> {
    let body: unknown;

    try {
      body = await externalApi.get<unknown>('/cost-center/list');
    } catch (error) {
      if (error instanceof ExternalApiError) {
        throw new AppError(502, MENSAGENS.ERRO_API_EXTERNA);
      }

      throw error;
    }

    const uniqueByCode = new Map<
      string,
      { costCenter: string; description: string }
    >();

    for (const item of extractList(body)) {
      const mapped = toSyncItem(item);

      if (mapped) {
        uniqueByCode.set(mapped.costCenter, mapped);
      }
    }

    const items = [...uniqueByCode.values()];

    if (items.length > 0) {
      await this.costCenterRepository.upsertMany(items);
    }

    const costCenters = await this.list();

    return {
      synced: items.length,
      costCenters,
    };
  }
}

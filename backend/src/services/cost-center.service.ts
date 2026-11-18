import { externalApi, ExternalApiError } from '../lib/external-api.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import { HierarchyRepository } from '../repositories/hierarchy.repository.js';
import type { CostCenterSummary } from '../types/cost-center.types.js';
import {
  assignUnits,
  collectSupervisors,
  toCostCenterSyncItem,
  type CostCenterSyncItem,
  type EmployeeIdentity,
} from '../utils/cost-center-hierarchy.js';
import { EmployeeService } from './employee.service.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

export const COST_CENTER_SYNC_JOB_NAME = 'cost-center-sync';
export const COST_CENTER_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

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

export class CostCenterService {
  constructor(
    private readonly costCenterRepository: CostCenterRepository,
    private readonly hierarchyRepository?: HierarchyRepository,
    private readonly listEmployees: () => Promise<EmployeeIdentity[]> = () =>
      new EmployeeService().listIdentities(),
  ) {}

  async list(): Promise<CostCenterSummary[]> {
    const costCenters = await this.costCenterRepository.findMany();
    return costCenters.map(toCostCenterSummary);
  }

  async syncFromExternal(): Promise<{
    synced: number;
    costCenters: CostCenterSummary[];
    promotedSupervisors: number;
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

    const uniqueByCode = new Map<string, CostCenterSyncItem>();

    for (const item of extractList(body)) {
      const mapped = toCostCenterSyncItem(item);

      if (mapped) {
        uniqueByCode.set(mapped.costCenter, mapped);
      }
    }

    // Badges come without unit; resolve each one against the employee list before
    // saving. If that list fails, the whole sync fails so stored units stay intact.
    const { items, unresolved } = assignUnits(
      [...uniqueByCode.values()],
      uniqueByCode.size > 0 ? await this.listEmployees() : [],
    );

    if (unresolved.length > 0) {
      console.warn(
        `[cost-center-sync] ${unresolved.length} badges not found in either unit's employee list: ${unresolved.join('; ')}`,
      );
    }

    if (items.length > 0) {
      await this.costCenterRepository.upsertMany(items);
    }

    let promotedSupervisors = 0;

    if (this.hierarchyRepository && items.length > 0) {
      const result = await this.hierarchyRepository.promoteSupervisors(
        collectSupervisors(items),
      );
      promotedSupervisors = result.promoted.length;
    }

    await this.costCenterRepository.upsertJob(
      COST_CENTER_SYNC_JOB_NAME,
      new Date(),
    );

    const costCenters = await this.list();

    return {
      synced: items.length,
      costCenters,
      promotedSupervisors,
    };
  }

  async runScheduledSyncIfDue(now = new Date()): Promise<{
    ran: boolean;
    synced?: number;
    promotedSupervisors?: number;
  }> {
    const job = await this.costCenterRepository.getJob(COST_CENTER_SYNC_JOB_NAME);

    if (job && now.getTime() - job.lastRunAt.getTime() < COST_CENTER_SYNC_INTERVAL_MS) {
      return { ran: false };
    }

    const result = await this.syncFromExternal();
    return {
      ran: true,
      synced: result.synced,
      promotedSupervisors: result.promotedSupervisors,
    };
  }
}

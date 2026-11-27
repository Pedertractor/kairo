import { UserRole } from '../generated/client.js';
import type {
  AdminTimeEntryRecord,
  AdminTimeEntryRepository,
  TimeEntryWriteData,
} from '../repositories/admin-time-entry.repository.js';
import type {
  AdminTimeEntryListQuery,
  AdminWorkItemsQuery,
  CreateAdminTimeEntryInput,
  UpdateAdminTimeEntryInput,
} from '../schemas/admin-time-entry.schema.js';
import type { TeamTimeEntrySummary } from '../types/time-entry.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { getEntryDurationSeconds } from '../utils/time-entry-duration.js';

/** Clock skew tolerated between the browser picking "now" and the server. */
const FUTURE_TOLERANCE_MS = 60_000;
/** Longest closed entry an admin may record; catches wrong-day typos. */
export const MAX_ENTRY_DURATION_MS = 24 * 60 * 60 * 1000;
const WORK_ITEM_SEARCH_LIMIT = 15;

export type AdminTimeEntryStore = Pick<
  AdminTimeEntryRepository,
  | 'inUserTransaction'
  | 'lockActor'
  | 'findUserById'
  | 'listUserOptions'
  | 'findEntryById'
  | 'list'
  | 'count'
  | 'findActivity'
  | 'findTask'
  | 'searchActivities'
  | 'searchTasks'
  | 'findOverlapping'
  | 'createManual'
  | 'update'
  | 'delete'
  | 'writeAudit'
  | 'findAuditByEntryId'
>;

export interface ActorLookup {
  findById(id: string): Promise<{ role: UserRole; active: boolean } | null>;
}

/** Moves the old work item back to PAUSED when its last running timer is gone. */
export type ReleaseWork = (
  item: { cardId: string | null; taskId: string | null },
  actorId: string,
) => Promise<void>;

export interface AdminTimeEntrySummary extends TeamTimeEntrySummary {}

export interface AdminTimeEntryAuditSnapshot {
  cardId: string | null;
  taskId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  note: string | null;
  type: string;
}

function snapshot(entry: {
  cardId: string | null;
  taskId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  note: string | null;
  type: string;
}): AdminTimeEntryAuditSnapshot {
  return {
    cardId: entry.cardId,
    taskId: entry.taskId,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
    durationSeconds: entry.durationSeconds,
    note: entry.note,
    type: entry.type,
  };
}

function sameSnapshot(
  a: AdminTimeEntryAuditSnapshot,
  b: AdminTimeEntryAuditSnapshot,
): boolean {
  return (
    a.cardId === b.cardId &&
    a.taskId === b.taskId &&
    a.startedAt === b.startedAt &&
    a.endedAt === b.endedAt &&
    a.note === b.note
  );
}

export function mapAdminTimeEntry(
  entry: AdminTimeEntryRecord,
): AdminTimeEntrySummary | null {
  const base = {
    id: entry.id,
    type: entry.type,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
    durationSeconds: entry.durationSeconds ?? getEntryDurationSeconds(entry),
    note: entry.note,
    userId: entry.user.id,
    userName: entry.user.name,
  };

  if (entry.task) {
    const parent = entry.task.card;

    return {
      ...base,
      kind: 'TASK',
      title: entry.task.title,
      parentTitle: parent.title,
      teamId: parent.teamId,
      teamName: parent.team.name,
      activityId: null,
      projectId: parent.id,
      taskId: entry.task.id,
    };
  }

  if (!entry.card || (entry.card.type !== 'ACTIVITY' && entry.card.type !== 'PROJECT')) {
    return null;
  }

  return {
    ...base,
    kind: entry.card.type,
    title: entry.card.title,
    parentTitle: null,
    teamId: entry.card.teamId,
    teamName: entry.card.team.name,
    activityId: entry.card.type === 'ACTIVITY' ? entry.card.id : null,
    projectId: entry.card.type === 'PROJECT' ? entry.card.id : null,
    taskId: null,
  };
}

function parseInstant(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
  }

  return date;
}

/**
 * Admin-only management of any collaborator's time entries.
 *
 * Every public method re-checks that the actor is an active ADMIN, on top of
 * the route guards, and every write re-checks it again inside the write
 * transaction and records an audit row in that same transaction.
 */
export class AdminTimeEntryService {
  constructor(
    private readonly actors: ActorLookup,
    private readonly store: AdminTimeEntryStore,
    private readonly releaseWork: ReleaseWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(actorId: string, query: AdminTimeEntryListQuery) {
    await this.requireActiveAdmin(actorId);

    const filters = {
      userId: query.userId,
      teamId: query.teamId,
      from: query.from,
      to: query.to,
      type: query.type,
      activeOnly: query.activeOnly,
    };
    const skip = (query.page - 1) * query.pageSize;
    const [entries, total] = await Promise.all([
      this.store.list(filters, skip, query.pageSize),
      this.store.count(filters),
    ]);

    return {
      timeEntries: entries
        .map(mapAdminTimeEntry)
        .filter((entry): entry is AdminTimeEntrySummary => entry !== null),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    };
  }

  async listUsers(actorId: string) {
    await this.requireActiveAdmin(actorId);
    return { users: await this.store.listUserOptions() };
  }

  async searchWorkItems(actorId: string, query: AdminWorkItemsQuery) {
    await this.requireActiveAdmin(actorId);

    const search = query.search || undefined;
    const [activities, tasks] = await Promise.all([
      this.store.searchActivities(search, query.teamId, WORK_ITEM_SEARCH_LIMIT),
      this.store.searchTasks(search, query.teamId, WORK_ITEM_SEARCH_LIMIT),
    ]);

    return {
      workItems: [
        ...activities.map((card) => ({
          kind: 'ACTIVITY' as const,
          id: card.id,
          title: card.title,
          parentTitle: null,
          status: card.status,
          teamId: card.teamId,
          teamName: card.team.name,
        })),
        ...tasks.map((task) => ({
          kind: 'TASK' as const,
          id: task.id,
          title: task.title,
          parentTitle: task.card.title,
          status: task.status,
          teamId: task.card.teamId,
          teamName: task.card.team.name,
        })),
      ],
    };
  }

  async getAudit(actorId: string, timeEntryId: string) {
    await this.requireActiveAdmin(actorId);

    const logs = await this.store.findAuditByEntryId(timeEntryId);

    return {
      auditLogs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorId: log.actor.id,
        actorName: log.actor.name,
        before: log.before,
        after: log.after,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  async create(actorId: string, input: CreateAdminTimeEntryInput) {
    await this.requireActiveAdmin(actorId);

    const target = await this.store.findUserById(input.userId);
    if (!target) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    const data: TimeEntryWriteData = {
      cardId: input.cardId ?? null,
      taskId: input.taskId ?? null,
      startedAt: parseInstant(input.startedAt),
      endedAt: parseInstant(input.endedAt),
      note: input.note ?? null,
    };

    this.assertValidInterval(data.startedAt, data.endedAt);
    await this.assertWorkItemExists(data);

    const created = await this.store.inUserTransaction(target.id, async (tx) => {
      await this.assertActorStillAdmin(tx, actorId);
      await this.assertNoOverlap(tx, target.id, data.startedAt, data.endedAt);

      const entry = await tx.createManual(target.id, data);
      await tx.writeAudit({
        timeEntryId: entry.id,
        targetUserId: target.id,
        actorId,
        action: 'CREATE',
        before: null,
        after: { ...snapshot(entry) },
      });

      return entry;
    });

    return this.toResponse(created);
  }

  async update(
    actorId: string,
    timeEntryId: string,
    input: UpdateAdminTimeEntryInput,
  ) {
    await this.requireActiveAdmin(actorId);

    const current = await this.store.findEntryById(timeEntryId);
    if (!current) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const { updated, previous } = await this.store.inUserTransaction(
      current.userId,
      async (tx) => {
        await this.assertActorStillAdmin(tx, actorId);

        // Re-read under the lock: another admin may have changed it meanwhile.
        const existing = await tx.findEntryById(timeEntryId);
        if (!existing) {
          throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
        }

        const itemChanged = Boolean(input.cardId || input.taskId);
        const data: TimeEntryWriteData = {
          cardId: itemChanged ? (input.cardId ?? null) : existing.cardId,
          taskId: itemChanged ? (input.taskId ?? null) : existing.taskId,
          startedAt:
            input.startedAt !== undefined
              ? parseInstant(input.startedAt)
              : existing.startedAt,
          endedAt:
            input.endedAt === undefined
              ? existing.endedAt
              : input.endedAt === null
                ? null
                : parseInstant(input.endedAt),
          note: input.note !== undefined ? input.note : existing.note,
        };

        if (existing.endedAt && !data.endedAt) {
          throw new AppError(400, MENSAGENS.APONTAMENTO_REABERTURA_PROIBIDA);
        }

        this.assertValidInterval(data.startedAt, data.endedAt);
        if (itemChanged) {
          await this.assertWorkItemExists(data, tx);
        }

        const before = snapshot(existing);
        const projected = snapshot({
          ...existing,
          ...data,
          durationSeconds: null,
        });

        if (sameSnapshot(before, projected)) {
          return { updated: existing, previous: existing };
        }

        await this.assertNoOverlap(
          tx,
          existing.userId,
          data.startedAt,
          data.endedAt,
          existing.id,
        );

        const saved = await tx.update(existing.id, data);
        await tx.writeAudit({
          timeEntryId: saved.id,
          targetUserId: saved.userId,
          actorId,
          action: 'UPDATE',
          before: { ...before },
          after: { ...snapshot(saved) },
        });

        return { updated: saved, previous: existing };
      },
    );

    const wasRunning = previous.endedAt === null;
    const leftOldItem =
      updated.cardId !== previous.cardId || updated.taskId !== previous.taskId;
    if (wasRunning && (updated.endedAt !== null || leftOldItem)) {
      await this.releaseWork(previous, actorId);
    }

    return this.toResponse(updated);
  }

  async remove(actorId: string, timeEntryId: string) {
    await this.requireActiveAdmin(actorId);

    const current = await this.store.findEntryById(timeEntryId);
    if (!current) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const removed = await this.store.inUserTransaction(
      current.userId,
      async (tx) => {
        await this.assertActorStillAdmin(tx, actorId);

        const existing = await tx.findEntryById(timeEntryId);
        if (!existing) {
          throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
        }

        await tx.delete(existing.id);
        await tx.writeAudit({
          timeEntryId: existing.id,
          targetUserId: existing.userId,
          actorId,
          action: 'DELETE',
          before: { ...snapshot(existing) },
          after: null,
        });

        return existing;
      },
    );

    if (removed.endedAt === null) {
      await this.releaseWork(removed, actorId);
    }

    return { timeEntryId: removed.id };
  }

  private toResponse(entry: AdminTimeEntryRecord) {
    const mapped = mapAdminTimeEntry(entry);

    if (!mapped) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    return { timeEntry: mapped };
  }

  private async requireActiveAdmin(actorId: string): Promise<void> {
    const actor = await this.actors.findById(actorId);

    if (!actor || !actor.active || actor.role !== UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }
  }

  private async assertActorStillAdmin(
    tx: Pick<AdminTimeEntryStore, 'lockActor'>,
    actorId: string,
  ): Promise<void> {
    const actor = await tx.lockActor(actorId);

    if (!actor || !actor.active || actor.role !== UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }
  }

  private assertValidInterval(startedAt: Date, endedAt: Date | null): void {
    const limit = this.now().getTime() + FUTURE_TOLERANCE_MS;

    if (startedAt.getTime() > limit || (endedAt && endedAt.getTime() > limit)) {
      throw new AppError(400, MENSAGENS.APONTAMENTO_DATA_FUTURA);
    }

    if (!endedAt) {
      return;
    }

    if (endedAt.getTime() <= startedAt.getTime()) {
      throw new AppError(400, MENSAGENS.APONTAMENTO_INTERVALO_INVALIDO);
    }

    if (endedAt.getTime() - startedAt.getTime() > MAX_ENTRY_DURATION_MS) {
      throw new AppError(400, MENSAGENS.APONTAMENTO_DURACAO_EXCEDIDA);
    }
  }

  private async assertWorkItemExists(
    data: Pick<TimeEntryWriteData, 'cardId' | 'taskId'>,
    store: Pick<AdminTimeEntryStore, 'findActivity' | 'findTask'> = this.store,
  ): Promise<void> {
    const found = data.taskId
      ? await store.findTask(data.taskId)
      : data.cardId
        ? await store.findActivity(data.cardId)
        : null;

    if (!found) {
      throw new AppError(404, MENSAGENS.APONTAMENTO_ITEM_NAO_ENCONTRADO);
    }
  }

  private async assertNoOverlap(
    tx: Pick<AdminTimeEntryStore, 'findOverlapping'>,
    userId: string,
    startedAt: Date,
    endedAt: Date | null,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await tx.findOverlapping(
      userId,
      startedAt,
      endedAt,
      excludeId,
    );

    if (overlapping) {
      throw new AppError(409, MENSAGENS.APONTAMENTO_SOBREPOSTO);
    }
  }
}

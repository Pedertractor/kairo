import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { User } from '../generated/client.js';
import { AppError } from '../utils/errors.js';
import { formatDateKey, parseDayBounds } from '../utils/app-timezone.js';
import { MENSAGENS } from '../utils/response.js';
import { releaseActivityIfIdle } from './card-status-sync.js';
import { releaseTaskIfIdle } from './task-status-sync.js';

export interface SetAbsentOptions {
  startDate?: string;
  endDate?: string | null;
  createdById: string;
}

export interface AbsenceListItem {
  id: string;
  userId: string;
  userName: string;
  createdById: string;
  createdByName: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  canCancel: boolean;
}

function parseDateTime(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
  }

  return date;
}

export class AbsenceService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly absenceRepository: AbsenceRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly taskRepository: TaskRepository,
    private readonly cardRepository: CardRepository,
  ) {}

  getCurrentPeriod(userId: string, now = new Date()) {
    return this.absenceRepository.findCoveringOn(userId, now);
  }

  findOverlappingForUsers(
    userIds: string[],
    rangeStart: Date,
    rangeEndExclusive: Date,
  ) {
    return this.absenceRepository.findOverlappingRange(
      userIds,
      rangeStart,
      rangeEndExclusive,
    );
  }

  async endCoveringAbsenceAt(userId: string, at: Date): Promise<void> {
    const covering = await this.absenceRepository.findCoveringOn(userId, at);

    if (!covering) {
      return;
    }

    if (covering.startedAt.getTime() >= at.getTime()) {
      await this.absenceRepository.delete(covering.id);
    } else {
      await this.absenceRepository.close(covering.id, at);
    }

    const stillCovering = await this.absenceRepository.findCoveringOn(
      userId,
      at,
    );
    await this.userRepository.setAbsent(userId, stillCovering !== null);
  }

  async listForActor(actorUserId: string): Promise<{
    absences: AbsenceListItem[];
    users: Array<{ id: string; name: string }>;
  }> {
    const actor = await this.getActiveUser(actorUserId);
    const visibleUsers =
      await this.userRepository.findManagedByTeamAdmin(actorUserId);
    const usersById = new Map(
      [actor, ...visibleUsers].map((user) => [user.id, user]),
    );
    const visibleUserIds = [...usersById.keys()];
    const users = [...usersById.values()]
      .filter((user) => user.active)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((user) => ({ id: user.id, name: user.name }));
    const periods = await this.absenceRepository.findVisible(visibleUserIds);
    const nowMs = Date.now();

    return {
      users,
      absences: periods.map((period) => ({
        id: period.id,
        userId: period.userId,
        userName: period.user.name,
        createdById: period.createdById,
        createdByName: period.createdBy.name,
        startedAt: period.startedAt.toISOString(),
        endedAt: period.endedAt?.toISOString() ?? null,
        createdAt: period.createdAt.toISOString(),
        canCancel: period.startedAt.getTime() > nowMs,
      })),
    };
  }

  async createForActor(
    actorUserId: string,
    targetUserId: string,
    startDate: string,
    endDate?: string | null,
  ): Promise<void> {
    await this.getActiveUser(actorUserId);
    const canManage = await this.canManageAbsenceTarget(
      actorUserId,
      targetUserId,
    );

    if (!canManage) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    await this.setAbsent(targetUserId, true, {
      startDate,
      endDate,
      createdById: actorUserId,
    });
  }

  async cancelFuture(actorUserId: string, absenceId: string): Promise<void> {
    await this.getActiveUser(actorUserId);
    const period = await this.absenceRepository.findById(absenceId);

    if (!period) {
      throw new AppError(404, MENSAGENS.AUSENCIA_NAO_ENCONTRADA);
    }

    const canManage =
      period.createdById === actorUserId ||
      (await this.canManageAbsenceTarget(actorUserId, period.userId));

    if (!canManage) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (period.startedAt.getTime() <= Date.now()) {
      throw new AppError(400, MENSAGENS.AUSENCIA_PASSADA_IMUTAVEL);
    }

    await this.absenceRepository.delete(absenceId);
  }

  async setAbsent(
    userId: string,
    absent: boolean,
    options: SetAbsentOptions,
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (absent) {
      return this.openPeriod(user, options);
    }

    return this.closePeriod(user);
  }

  private async openPeriod(
    user: User,
    options: SetAbsentOptions,
  ): Promise<User> {
    const now = new Date();
    const startedAt = options.startDate
      ? parseDateTime(options.startDate)
      : now;

    let endedAt: Date | null = null;
    if (options.endDate !== undefined && options.endDate !== null) {
      endedAt = parseDateTime(options.endDate);
      if (endedAt.getTime() <= startedAt.getTime()) {
        throw new AppError(400, MENSAGENS.AUSENCIA_FIM_ANTES_INICIO);
      }
    }

    await this.validateCreationDate(user.id, startedAt, now);

    const open = await this.absenceRepository.findOpenByUserId(user.id);
    if (open) {
      throw new AppError(400, MENSAGENS.AUSENCIA_JA_ATIVA);
    }

    const overlapping = await this.absenceRepository.findOverlapping(
      user.id,
      startedAt,
      endedAt,
    );
    if (overlapping) {
      throw new AppError(400, MENSAGENS.AUSENCIA_SOBREPOSTA);
    }

    await this.absenceRepository.create({
      userId: user.id,
      startedAt,
      endedAt,
      createdById: options.createdById,
    });

    // A period scheduled to start later must not change the current state, and
    // an earlier period may still be covering `now`.
    const covering = await this.absenceRepository.findCoveringOn(user.id, now);
    const updated = await this.userRepository.setAbsent(
      user.id,
      covering !== null,
    );

    if (covering) {
      const activeEntry =
        await this.timeEntryRepository.findActiveByUserId(user.id);

      if (activeEntry) {
        await this.timeEntryRepository.stopEntry(activeEntry, new Date());
        await releaseTaskIfIdle(
          this.timeEntryRepository,
          this.taskRepository,
          activeEntry.taskId,
        );
        await releaseActivityIfIdle(
          this.timeEntryRepository,
          this.cardRepository,
          activeEntry.cardId,
        );
      }
    }

    return updated;
  }

  private async canManageAbsenceTarget(
    actorUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (actorUserId === targetUserId) {
      return true;
    }

    return this.userRepository.canLeaderManageUser(actorUserId, targetUserId);
  }

  private async getActiveUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    return user;
  }

  private async validateCreationDate(
    userId: string,
    startedAt: Date,
    now: Date,
  ): Promise<void> {
    const startDateKey = formatDateKey(startedAt);
    const todayKey = formatDateKey(now);

    if (startDateKey >= todayKey) {
      return;
    }

    const { dayStart, dayEnd } = parseDayBounds(startDateKey);
    const hasTimeEntry = await this.timeEntryRepository.hasAnyOnDay(
      userId,
      dayStart,
      dayEnd,
    );

    if (!hasTimeEntry) {
      throw new AppError(400, MENSAGENS.AUSENCIA_PASSADA_SEM_APONTAMENTO);
    }
  }

  private async closePeriod(user: User): Promise<User> {
    const now = new Date();
    const covering = await this.absenceRepository.findCoveringOn(user.id, now);

    if (covering) {
      await this.absenceRepository.close(covering.id, now);
    }

    return this.userRepository.setAbsent(user.id, false);
  }
}

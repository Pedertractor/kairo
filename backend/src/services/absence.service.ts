import { AbsenceRepository } from '../repositories/absence.repository.js';
import {
  toHierarchyPerson,
  type HierarchyRepository,
} from '../repositories/hierarchy.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserRole, type User } from '../generated/client.js';
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
  canDelete: boolean;
}

export interface AdminAbsenceFilters {
  userId?: string;
  createdById?: string;
  status?: 'scheduled' | 'ongoing' | 'finished';
  from?: string;
  to?: string;
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
    private readonly hierarchyRepository?: Pick<
      HierarchyRepository,
      'findLeaderUserIdsOfSupervisor'
    >,
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
    const users = [...usersById.values()]
      .filter((user) => user.active)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((user) => ({ id: user.id, name: user.name }));
    const deletionScope = await this.findDeletionScope(actor);
    // Supervisors also see their hierarchy's absences, so they can delete them.
    const visibleUserIds = [
      ...new Set([...usersById.keys(), ...deletionScope]),
    ];
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
        canDelete: this.canDeleteInScope(actor, deletionScope, period),
      })),
    };
  }

  async countUnseenForActor(actorUserId: string): Promise<{
    count: number;
    absencesSeenAt: string | null;
  }> {
    const actor = await this.getActiveUser(actorUserId);
    const managedUsers =
      await this.userRepository.findManagedByTeamAdmin(actorUserId);
    const managedUserIds = managedUsers.map((user) => user.id);
    const count = await this.absenceRepository.countCreatedByOthersSince(
      managedUserIds,
      actorUserId,
      actor.absencesSeenAt,
    );

    return {
      count,
      absencesSeenAt: actor.absencesSeenAt?.toISOString() ?? null,
    };
  }

  async markSeenForActor(actorUserId: string): Promise<{
    count: number;
    absencesSeenAt: string;
  }> {
    await this.getActiveUser(actorUserId);
    const at = new Date();
    const updated = await this.userRepository.markAbsencesSeen(
      actorUserId,
      at,
    );

    return {
      count: 0,
      absencesSeenAt: updated.absencesSeenAt!.toISOString(),
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

  async listForAdmin(
    actorUserId: string,
    filters: AdminAbsenceFilters = {},
  ): Promise<{
    absences: AbsenceListItem[];
    users: Array<{ id: string; name: string }>;
  }> {
    await this.requireAdmin(actorUserId);
    const now = new Date();
    const periods = await this.absenceRepository.findAllFiltered({
      userId: filters.userId,
      createdById: filters.createdById,
      status: filters.status,
      from: filters.from ? parseDateTime(filters.from) : undefined,
      to: filters.to ? parseDateTime(filters.to) : undefined,
      now,
    });
    const users = (await this.userRepository.findAll({ active: true }))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((user) => ({ id: user.id, name: user.name }));
    const nowMs = now.getTime();

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
        canDelete: true,
      })),
    };
  }

  async updateForAdmin(
    actorUserId: string,
    absenceId: string,
    userId: string,
    startDate: string,
    endDate?: string | null,
  ): Promise<void> {
    await this.requireAdmin(actorUserId);
    const period = await this.absenceRepository.findById(absenceId);

    if (!period) {
      throw new AppError(404, MENSAGENS.AUSENCIA_NAO_ENCONTRADA);
    }

    const target = await this.userRepository.findById(userId);

    if (!target) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (!target.active && target.id !== period.userId) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    const startedAt = parseDateTime(startDate);
    let endedAt: Date | null = null;

    if (endDate !== undefined && endDate !== null) {
      endedAt = parseDateTime(endDate);
      if (endedAt.getTime() <= startedAt.getTime()) {
        throw new AppError(400, MENSAGENS.AUSENCIA_FIM_ANTES_INICIO);
      }
    }

    const overlapping = await this.absenceRepository.findOverlapping(
      userId,
      startedAt,
      endedAt,
      absenceId,
    );

    if (overlapping) {
      throw new AppError(400, MENSAGENS.AUSENCIA_SOBREPOSTA);
    }

    const previousUserId = period.userId;

    await this.absenceRepository.update(absenceId, {
      userId,
      startedAt,
      endedAt,
    });

    await this.syncAbsentFlag(previousUserId);

    if (previousUserId !== userId) {
      await this.syncAbsentFlag(userId);
    }

    await this.stopActiveTimerIfCovered(userId);
  }

  async deleteForAdmin(actorUserId: string, absenceId: string): Promise<void> {
    await this.requireAdmin(actorUserId);
    const period = await this.absenceRepository.findById(absenceId);

    if (!period) {
      throw new AppError(404, MENSAGENS.AUSENCIA_NAO_ENCONTRADA);
    }

    const userId = period.userId;
    await this.absenceRepository.delete(absenceId);
    await this.syncAbsentFlag(userId);
  }

  /**
   * Leaders and supervisors may delete any absence (past, ongoing or
   * scheduled) of their subordinates, as long as it was created by the actor
   * or by one of those subordinates. Anything else stays admin-only.
   */
  async deleteForSubordinate(
    actorUserId: string,
    absenceId: string,
  ): Promise<void> {
    const actor = await this.getActiveUser(actorUserId);

    if (actor.role !== UserRole.LEADER && actor.role !== UserRole.SUPERVISOR) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const period = await this.absenceRepository.findById(absenceId);

    if (!period) {
      throw new AppError(404, MENSAGENS.AUSENCIA_NAO_ENCONTRADA);
    }

    const scope = await this.findDeletionScope(actor);

    if (!this.canDeleteInScope(actor, scope, period)) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    await this.absenceRepository.delete(absenceId);
    await this.syncAbsentFlag(period.userId);
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
          options.createdById,
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

  /**
   * Who answers to the actor: a leader's team members; a supervisor's leaders
   * from the cost center hierarchy plus the members of those leaders' teams.
   */
  private async findDeletionScope(actor: User): Promise<Set<string>> {
    if (actor.role === UserRole.LEADER) {
      const managed = await this.userRepository.findManagedByTeamAdmin(
        actor.id,
      );
      return new Set(managed.map((user) => user.id));
    }

    if (actor.role !== UserRole.SUPERVISOR || !this.hierarchyRepository) {
      return new Set();
    }

    const leaderIds = (
      await this.hierarchyRepository.findLeaderUserIdsOfSupervisor(
        toHierarchyPerson(actor),
      )
    ).filter((id) => id !== actor.id);
    const members = await this.userRepository.findManagedByTeamAdmins([
      actor.id,
      ...leaderIds,
    ]);

    return new Set([...leaderIds, ...members.map((user) => user.id)]);
  }

  private canDeleteInScope(
    actor: User,
    scope: Set<string>,
    period: { userId: string; createdById: string },
  ): boolean {
    if (period.userId === actor.id || !scope.has(period.userId)) {
      return false;
    }

    return period.createdById === actor.id || scope.has(period.createdById);
  }

  private async requireAdmin(actorUserId: string): Promise<User> {
    const actor = await this.getActiveUser(actorUserId);

    if (actor.role !== UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    return actor;
  }

  private async syncAbsentFlag(userId: string, now = new Date()): Promise<void> {
    const covering = await this.absenceRepository.findCoveringOn(userId, now);
    await this.userRepository.setAbsent(userId, covering !== null);
  }

  private async stopActiveTimerIfCovered(userId: string, now = new Date()) {
    const covering = await this.absenceRepository.findCoveringOn(userId, now);

    if (!covering) {
      return;
    }

    const activeEntry =
      await this.timeEntryRepository.findActiveByUserId(userId);

    if (!activeEntry) {
      return;
    }

    await this.timeEntryRepository.stopEntry(activeEntry, now);
    await releaseTaskIfIdle(
      this.timeEntryRepository,
      this.taskRepository,
      activeEntry.taskId,
    );
    await releaseActivityIfIdle(
      this.timeEntryRepository,
      this.cardRepository,
      activeEntry.cardId,
      covering.createdById,
    );
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

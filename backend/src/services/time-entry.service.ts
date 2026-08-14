import type { TimeEntry } from '../generated/client.js';
import { UserRole } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type {
  ActiveTimer,
  DayDashboard,
  DayTimelineBlock,
  PaginatedTaskTimeEntries,
  PaginatedTeamTimeEntries,
  PaginatedUserTimeEntries,
  RecentWorkItem,
  RecentWorkItemKind,
  TaskTimeEntrySummary,
  TeamDayDashboard,
  TeamDayTimelineBlock,
  TeamTimeEntrySummary,
  TimeEntrySummary,
  UserTimeEntrySummary,
} from '../types/time-entry.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { getEntryDurationSeconds } from '../utils/time-entry-duration.js';
import { AbsenceService } from './absence.service.js';
import { releaseActivityIfIdle } from './card-status-sync.js';
import { releaseTaskIfIdle } from './task-status-sync.js';

function toTimeEntrySummary(entry: TimeEntry): TimeEntrySummary {
  return {
    id: entry.id,
    cardId: entry.cardId,
    taskId: entry.taskId,
    userId: entry.userId,
    type: entry.type,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
    durationSeconds: entry.durationSeconds,
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

type ActiveEntryWithRelations = TimeEntry & {
  card: {
    id: string;
    title: string;
    teamId: string;
    type: string;
  } | null;
  task: {
    id: string;
    title: string;
    card: {
      id: string;
      title: string;
      teamId: string;
      type: string;
    };
  } | null;
};

function toActiveTimer(entry: ActiveEntryWithRelations): ActiveTimer | null {
  if (entry.taskId && entry.task) {
    const parentCard = entry.task.card;

    if (!parentCard || parentCard.type !== 'PROJECT') {
      return null;
    }

    return {
      timeEntry: toTimeEntrySummary(entry),
      task: {
        id: entry.task.id,
        title: entry.task.title,
        teamId: parentCard.teamId,
        projectId: parentCard.id,
        projectTitle: parentCard.title,
      },
    };
  }

  if (!entry.cardId || !entry.card || entry.card.type !== 'ACTIVITY') {
    return null;
  }

  return {
    timeEntry: toTimeEntrySummary(entry),
    activity: {
      id: entry.card.id,
      title: entry.card.title,
      teamId: entry.card.teamId,
    },
  };
}

type RecentEntry = Awaited<
  ReturnType<TimeEntryRepository['findRecentByUserId']>
>[number];

type UserEntry = Awaited<
  ReturnType<TimeEntryRepository['findByUserId']>
>[number];

type DayEntry = Awaited<
  ReturnType<TimeEntryRepository['findOverlappingDay']>
>[number];

type TeamDayEntry = Awaited<
  ReturnType<TimeEntryRepository['findOverlappingDayByTeamId']>
>[number];

type TaskEntryWithUser = Awaited<
  ReturnType<TimeEntryRepository['findByTaskId']>
>[number];

type CardEntryWithUser = Awaited<
  ReturnType<TimeEntryRepository['findByCardId']>
>[number];

type TeamEntry = Awaited<
  ReturnType<TimeEntryRepository['findByTeamId']>
>[number];

function toTaskTimeEntrySummary(
  entry: TaskEntryWithUser | CardEntryWithUser,
): TaskTimeEntrySummary {
  return {
    id: entry.id,
    userId: entry.userId,
    userName: entry.user.name,
    type: entry.type,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
    durationSeconds:
      entry.durationSeconds ?? getEntryDurationSeconds(entry),
    note: entry.note,
  };
}

function parseDayBounds(date: string): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(`${date}T00:00:00.000`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return { dayStart, dayEnd };
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getOverlapSeconds(
  entryStart: Date,
  entryEnd: Date,
  dayStart: Date,
  dayEnd: Date,
): number {
  const start = Math.max(entryStart.getTime(), dayStart.getTime());
  const end = Math.min(entryEnd.getTime(), dayEnd.getTime());

  return Math.max(0, Math.floor((end - start) / 1000));
}

function mapDayEntryToBlock(
  entry: DayEntry,
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): DayTimelineBlock | null {
  const entryEnd = entry.endedAt ?? now;
  const overlapStart = new Date(
    Math.max(entry.startedAt.getTime(), dayStart.getTime()),
  );
  const overlapEnd = new Date(Math.min(entryEnd.getTime(), dayEnd.getTime()));

  if (overlapStart >= overlapEnd) {
    return null;
  }

  if (entry.task) {
    const parentCard = entry.task.card;

    if (!parentCard) {
      return null;
    }

    return {
      id: entry.id,
      title: `${parentCard.title} · ${entry.task.title}`,
      kind: 'TASK',
      teamId: parentCard.teamId,
      startedAt: overlapStart.toISOString(),
      endedAt: entry.endedAt ? overlapEnd.toISOString() : null,
      isActive: entry.endedAt === null,
    };
  }

  if (!entry.card) {
    return null;
  }

  const kind = entry.card.type as RecentWorkItemKind;

  if (kind !== 'ACTIVITY' && kind !== 'PROJECT') {
    return null;
  }

  return {
    id: entry.id,
    title: entry.card.title,
    kind,
    teamId: entry.card.teamId,
    startedAt: overlapStart.toISOString(),
    endedAt: entry.endedAt ? overlapEnd.toISOString() : null,
    isActive: entry.endedAt === null,
  };
}

function mapTeamDayEntryToBlock(
  entry: TeamDayEntry,
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): TeamDayTimelineBlock | null {
  const mapped = mapDayEntryToBlock(entry, dayStart, dayEnd, now);

  if (!mapped) {
    return null;
  }

  return {
    ...mapped,
    userId: entry.user.id,
    userName: entry.user.name,
  };
}

function getWorkItemKey(entry: DayEntry): string | null {
  if (entry.taskId) {
    return `task:${entry.taskId}`;
  }

  if (entry.cardId) {
    return `card:${entry.cardId}`;
  }

  return null;
}

function mapRecentEntry(entry: RecentEntry): RecentWorkItem | null {
  if (entry.task) {
    const parentCard = entry.task.card;

    if (!parentCard) {
      return null;
    }

    return {
      kind: 'TASK',
      id: entry.task.id,
      title: entry.task.title,
      teamId: parentCard.teamId,
      teamName: parentCard.team.name,
      status: entry.task.status,
      parentTitle: parentCard.title,
      lastWorkedAt: entry.startedAt.toISOString(),
      canStartTimer: !['DONE', 'CANCELED'].includes(entry.task.status),
      activityId: null,
      projectId: parentCard.id,
      taskId: entry.task.id,
    };
  }

  if (!entry.card) {
    return null;
  }

  const kind = entry.card.type as RecentWorkItemKind;

  if (kind !== 'ACTIVITY' && kind !== 'PROJECT') {
    return null;
  }

  return {
    kind,
    id: entry.card.id,
    title: entry.card.title,
    teamId: entry.card.teamId,
    teamName: entry.card.team.name,
    status: entry.card.status,
    parentTitle: null,
    lastWorkedAt: entry.startedAt.toISOString(),
      canStartTimer:
        kind === 'ACTIVITY' &&
        !['DONE', 'CANCELED'].includes(entry.card.status),
    activityId: kind === 'ACTIVITY' ? entry.card.id : null,
    projectId: kind === 'PROJECT' ? entry.card.id : null,
    taskId: null,
  };
}

function mapUserTimeEntry(entry: UserEntry): UserTimeEntrySummary | null {
  if (entry.task) {
    const parentCard = entry.task.card;

    if (!parentCard) {
      return null;
    }

    return {
      id: entry.id,
      type: entry.type,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt?.toISOString() ?? null,
      durationSeconds:
        entry.durationSeconds ?? getEntryDurationSeconds(entry),
      note: entry.note,
      kind: 'TASK',
      title: entry.task.title,
      parentTitle: parentCard.title,
      teamId: parentCard.teamId,
      teamName: parentCard.team.name,
      activityId: null,
      projectId: parentCard.id,
      taskId: entry.task.id,
    };
  }

  if (!entry.card) {
    return null;
  }

  const kind = entry.card.type as RecentWorkItemKind;

  if (kind !== 'ACTIVITY' && kind !== 'PROJECT') {
    return null;
  }

  return {
    id: entry.id,
    type: entry.type,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
    durationSeconds:
      entry.durationSeconds ?? getEntryDurationSeconds(entry),
    note: entry.note,
    kind,
    title: entry.card.title,
    parentTitle: null,
    teamId: entry.card.teamId,
    teamName: entry.card.team.name,
    activityId: kind === 'ACTIVITY' ? entry.card.id : null,
    projectId: kind === 'PROJECT' ? entry.card.id : null,
    taskId: null,
  };
}

function mapTeamTimeEntry(entry: TeamEntry): TeamTimeEntrySummary | null {
  const mapped = mapUserTimeEntry(entry);

  if (!mapped) {
    return null;
  }

  return {
    ...mapped,
    userId: entry.user.id,
    userName: entry.user.name,
  };
}

export class TimeEntryService {
  constructor(
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly cardRepository: CardRepository,
    private readonly teamRepository: TeamRepository,
    private readonly taskRepository: TaskRepository,
    private readonly userRepository: UserRepository,
    private readonly absenceService: AbsenceService,
  ) {}

  async getActiveTimer(userId: string): Promise<ActiveTimer | null> {
    const entry = await this.timeEntryRepository.findActiveByUserId(userId);

    if (!entry) {
      return null;
    }

    return toActiveTimer(entry);
  }

  private async pauseWorkForStoppedEntry(
    taskId: string | null | undefined,
    cardId: string | null | undefined,
  ): Promise<void> {
    await releaseTaskIfIdle(
      this.timeEntryRepository,
      this.taskRepository,
      taskId,
    );
    await releaseActivityIfIdle(
      this.timeEntryRepository,
      this.cardRepository,
      cardId,
    );
  }

  private async assertUserPresent(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (await this.absenceService.isCurrentlyAbsent(userId)) {
      throw new AppError(403, MENSAGENS.USUARIO_AUSENTE);
    }
  }

  async startActivityTimer(
    teamId: string,
    activityId: string,
    userId: string,
  ): Promise<ActiveTimer> {
    await this.assertUserPresent(userId);

    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const card = await this.cardRepository.findActivityById(activityId);

    if (!card || card.teamId !== teamId || card.type !== 'ACTIVITY') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (card.status === 'DONE' || card.status === 'CANCELED') {
      throw new AppError(400, MENSAGENS.ATIVIDADE_TIMER_STATUS_INVALIDO);
    }

    const activeEntry =
      await this.timeEntryRepository.findActiveByUserId(userId);

    if (activeEntry?.cardId === activityId) {
      throw new AppError(400, MENSAGENS.TIMER_JA_ATIVO);
    }

    const startedAt = new Date();

    if (activeEntry) {
      await this.timeEntryRepository.stopEntry(activeEntry, startedAt);
      await this.pauseWorkForStoppedEntry(
        activeEntry.taskId,
        activeEntry.cardId,
      );
    }

    const entry = await this.timeEntryRepository.startTimer({
      cardId: activityId,
      userId,
      startedAt,
    });

    const marked = await this.cardRepository.updateStatusIfOpen(
      activityId,
      'IN_PROGRESS',
    );

    if (marked.count === 0) {
      await this.timeEntryRepository.deleteById(entry.id);
      throw new AppError(400, MENSAGENS.ATIVIDADE_TIMER_STATUS_INVALIDO);
    }

    return {
      timeEntry: toTimeEntrySummary(entry),
      activity: {
        id: card.id,
        title: card.title,
        teamId: card.teamId,
      },
    };
  }

  async startTaskTimer(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<ActiveTimer> {
    await this.assertUserPresent(userId);

    const task = await this.taskRepository.findById(taskId);

    if (
      !task ||
      task.cardId !== projectId ||
      !task.card ||
      task.card.type !== 'PROJECT'
    ) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (task.status === 'DONE' || task.status === 'CANCELED') {
      throw new AppError(400, MENSAGENS.TAREFA_TIMER_STATUS_INVALIDO);
    }

    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      task.card.teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const activeEntry =
      await this.timeEntryRepository.findActiveByUserId(userId);

    if (activeEntry?.taskId === taskId) {
      throw new AppError(400, MENSAGENS.TIMER_JA_ATIVO);
    }

    const startedAt = new Date();

    if (activeEntry) {
      await this.timeEntryRepository.stopEntry(activeEntry, startedAt);
      await this.pauseWorkForStoppedEntry(
        activeEntry.taskId,
        activeEntry.cardId,
      );
    }

    const entry = await this.timeEntryRepository.startTaskTimer({
      taskId,
      userId,
      startedAt,
    });

    const marked = await this.taskRepository.updateStatusIfOpen(
      taskId,
      'IN_PROGRESS',
    );

    // The task was closed between the guard above and this write.
    if (marked.count === 0) {
      await this.timeEntryRepository.deleteById(entry.id);
      throw new AppError(400, MENSAGENS.TAREFA_TIMER_STATUS_INVALIDO);
    }

    return {
      timeEntry: toTimeEntrySummary(entry),
      task: {
        id: task.id,
        title: task.title,
        teamId: task.card.teamId,
        projectId: task.card.id,
        projectTitle: task.card.title,
      },
    };
  }

  async pauseActiveTimer(userId: string): Promise<TimeEntrySummary> {
    const activeEntry =
      await this.timeEntryRepository.findActiveByUserId(userId);

    if (!activeEntry) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const stopped = await this.timeEntryRepository.stopEntry(
      activeEntry,
      new Date(),
    );

    await this.pauseWorkForStoppedEntry(
      activeEntry.taskId,
      activeEntry.cardId,
    );

    return toTimeEntrySummary(stopped);
  }

  async listTaskTimeEntries(
    projectId: string,
    taskId: string,
    userId: string,
    options: { date?: string; page: number; pageSize: number },
  ): Promise<PaginatedTaskTimeEntries> {
    const task = await this.taskRepository.findById(taskId);

    if (
      !task ||
      task.cardId !== projectId ||
      !task.card ||
      task.card.type !== 'PROJECT'
    ) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      task.card.teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const skip = (options.page - 1) * options.pageSize;

    const [entries, total] = await Promise.all([
      this.timeEntryRepository.findByTaskId(taskId, {
        date: options.date,
        skip,
        take: options.pageSize,
      }),
      this.timeEntryRepository.countByTaskId(taskId, options.date),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / options.pageSize);

    return {
      timeEntries: entries.map(toTaskTimeEntrySummary),
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        total,
        totalPages,
      },
    };
  }

  async listActivityTimeEntries(
    teamId: string,
    activityId: string,
    userId: string,
    options: { date?: string; page: number; pageSize: number },
  ): Promise<PaginatedTaskTimeEntries> {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const card = await this.cardRepository.findActivityById(activityId);

    if (!card || card.teamId !== teamId || card.type !== 'ACTIVITY') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const skip = (options.page - 1) * options.pageSize;

    const [entries, total] = await Promise.all([
      this.timeEntryRepository.findByCardId(activityId, {
        date: options.date,
        skip,
        take: options.pageSize,
      }),
      this.timeEntryRepository.countByCardId(activityId, options.date),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / options.pageSize);

    return {
      timeEntries: entries.map(toTaskTimeEntrySummary),
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        total,
        totalPages,
      },
    };
  }

  async updateTaskTimeEntry(
    projectId: string,
    taskId: string,
    timeEntryId: string,
    userId: string,
    startedAt: string,
    endedAt: string | null,
  ): Promise<TaskTimeEntrySummary> {
    const actor = await this.userRepository.findById(userId);

    if (!actor || !actor.active || actor.role !== UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const entry = await this.timeEntryRepository.findById(timeEntryId);

    if (
      !entry ||
      entry.taskId !== taskId ||
      !entry.task ||
      entry.task.cardId !== projectId ||
      entry.task.card.type !== 'PROJECT'
    ) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (entry.userId !== userId) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      entry.task.card.teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const startedAtDate = new Date(startedAt);
    const endedAtDate = endedAt ? new Date(endedAt) : null;

    if (
      endedAtDate &&
      startedAtDate.getTime() >= endedAtDate.getTime()
    ) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    const updated = await this.timeEntryRepository.updateDates(
      timeEntryId,
      startedAtDate,
      endedAtDate,
    );

    await this.pauseWorkForStoppedEntry(taskId, null);

    return toTaskTimeEntrySummary(updated);
  }

  async updateUserTimeEntry(
    timeEntryId: string,
    userId: string,
    startedAt: string,
    endedAt: string | null,
  ): Promise<UserTimeEntrySummary> {
    const entry =
      await this.timeEntryRepository.findByIdWithRelations(timeEntryId);

    if (!entry || entry.userId !== userId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const teamId = entry.task?.card?.teamId ?? entry.card?.teamId;

    if (!teamId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const startedAtDate = new Date(startedAt);
    const endedAtDate = endedAt ? new Date(endedAt) : null;

    if (
      endedAtDate &&
      startedAtDate.getTime() >= endedAtDate.getTime()
    ) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    await this.timeEntryRepository.updateDates(
      timeEntryId,
      startedAtDate,
      endedAtDate,
    );

    await this.pauseWorkForStoppedEntry(entry.taskId, entry.cardId);

    const updated =
      await this.timeEntryRepository.findByIdWithRelations(timeEntryId);

    if (!updated) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const mapped = mapUserTimeEntry(updated);

    if (!mapped) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    return mapped;
  }

  async listUserTimeEntries(
    userId: string,
    options: { date?: string; page: number; pageSize: number },
  ): Promise<PaginatedUserTimeEntries> {
    const skip = (options.page - 1) * options.pageSize;

    const [entries, total] = await Promise.all([
      this.timeEntryRepository.findByUserId(userId, {
        date: options.date,
        skip,
        take: options.pageSize,
      }),
      this.timeEntryRepository.countByUserId(userId, options.date),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / options.pageSize);

    return {
      timeEntries: entries
        .map(mapUserTimeEntry)
        .filter((entry): entry is UserTimeEntrySummary => entry !== null),
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        total,
        totalPages,
      },
    };
  }

  async listTeamTimeEntries(
    teamId: string,
    userId: string,
    options: { date?: string; page: number; pageSize: number },
  ): Promise<PaginatedTeamTimeEntries> {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const skip = (options.page - 1) * options.pageSize;

    const [entries, total] = await Promise.all([
      this.timeEntryRepository.findByTeamId(teamId, {
        date: options.date,
        skip,
        take: options.pageSize,
      }),
      this.timeEntryRepository.countByTeamId(teamId, options.date),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / options.pageSize);

    return {
      timeEntries: entries
        .map(mapTeamTimeEntry)
        .filter((entry): entry is TeamTimeEntrySummary => entry !== null),
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        total,
        totalPages,
      },
    };
  }

  async getRecentWorkItems(
    userId: string,
    limit = 8,
  ): Promise<RecentWorkItem[]> {
    const entries = await this.timeEntryRepository.findRecentByUserId(userId);
    const seen = new Set<string>();
    const items: RecentWorkItem[] = [];

    for (const entry of entries) {
      const item = mapRecentEntry(entry);

      if (!item) {
        continue;
      }

      const key = item.kind === 'TASK' ? `task:${item.id}` : `card:${item.id}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      items.push(item);

      if (items.length >= limit) {
        break;
      }
    }

    return items;
  }

  async getDayDashboard(userId: string, date?: string): Promise<DayDashboard> {
    const targetDate = date ?? formatDateKey(new Date());
    const { dayStart, dayEnd } = parseDayBounds(targetDate);
    const now = new Date();

    const previousDay = new Date(dayStart);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDate = formatDateKey(previousDay);
    const { dayStart: prevStart, dayEnd: prevEnd } =
      parseDayBounds(previousDate);

    const [entries, previousEntries] = await Promise.all([
      this.timeEntryRepository.findOverlappingDay(userId, dayStart, dayEnd),
      this.timeEntryRepository.findOverlappingDay(userId, prevStart, prevEnd),
    ]);

    let loggedSeconds = 0;
    const categories = new Set<string>();

    for (const entry of entries) {
      const entryEnd = entry.endedAt ?? now;
      loggedSeconds += getOverlapSeconds(
        entry.startedAt,
        entryEnd,
        dayStart,
        dayEnd,
      );

      const key = getWorkItemKey(entry);

      if (key) {
        categories.add(key);
      }
    }

    let previousLoggedSeconds = 0;

    for (const entry of previousEntries) {
      const entryEnd = entry.endedAt ?? now;
      previousLoggedSeconds += getOverlapSeconds(
        entry.startedAt,
        entryEnd,
        prevStart,
        prevEnd,
      );
    }

    const changePercent =
      previousLoggedSeconds > 0
        ? Math.round(
            ((loggedSeconds - previousLoggedSeconds) / previousLoggedSeconds) *
              100,
          )
        : null;

    const blocks = entries
      .map((entry) => mapDayEntryToBlock(entry, dayStart, dayEnd, now))
      .filter((block): block is DayTimelineBlock => block !== null);

    return {
      date: targetDate,
      stats: {
        loggedSeconds,
        changePercent,
        uniqueCategories: categories.size,
      },
      blocks,
    };
  }

  async getTeamDayDashboard(
    teamId: string,
    userId: string,
    date?: string,
  ): Promise<TeamDayDashboard> {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const targetDate = date ?? formatDateKey(new Date());
    const { dayStart, dayEnd } = parseDayBounds(targetDate);
    const now = new Date();

    const previousDay = new Date(dayStart);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDate = formatDateKey(previousDay);
    const { dayStart: prevStart, dayEnd: prevEnd } =
      parseDayBounds(previousDate);

    const [entries, previousEntries] = await Promise.all([
      this.timeEntryRepository.findOverlappingDayByTeamId(
        teamId,
        dayStart,
        dayEnd,
      ),
      this.timeEntryRepository.findOverlappingDayByTeamId(
        teamId,
        prevStart,
        prevEnd,
      ),
    ]);

    let loggedSeconds = 0;
    const activeMemberIds = new Set<string>();

    for (const entry of entries) {
      const entryEnd = entry.endedAt ?? now;
      loggedSeconds += getOverlapSeconds(
        entry.startedAt,
        entryEnd,
        dayStart,
        dayEnd,
      );
      activeMemberIds.add(entry.userId);
    }

    let previousLoggedSeconds = 0;

    for (const entry of previousEntries) {
      const entryEnd = entry.endedAt ?? now;
      previousLoggedSeconds += getOverlapSeconds(
        entry.startedAt,
        entryEnd,
        prevStart,
        prevEnd,
      );
    }

    const changePercent =
      previousLoggedSeconds > 0
        ? Math.round(
            ((loggedSeconds - previousLoggedSeconds) / previousLoggedSeconds) *
              100,
          )
        : null;

    const blocks = entries
      .map((entry) => mapTeamDayEntryToBlock(entry, dayStart, dayEnd, now))
      .filter((block): block is TeamDayTimelineBlock => block !== null);

    return {
      date: targetDate,
      stats: {
        loggedSeconds,
        changePercent,
        activeMembers: activeMemberIds.size,
      },
      blocks,
    };
  }
}

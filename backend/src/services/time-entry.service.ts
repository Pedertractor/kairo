import type { TimeEntry } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import type {
  ActiveTimer,
  RecentWorkItem,
  RecentWorkItemKind,
  TimeEntrySummary,
} from '../types/time-entry.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

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

type ActiveEntryWithCard = TimeEntry & {
  card: {
    id: string;
    title: string;
    teamId: string;
    type: string;
  } | null;
};

function toActiveTimer(entry: ActiveEntryWithCard): ActiveTimer | null {
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
      canStartTimer: false,
      activityId: null,
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
    canStartTimer: kind === 'ACTIVITY',
    activityId: kind === 'ACTIVITY' ? entry.card.id : null,
  };
}

export class TimeEntryService {
  constructor(
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly cardRepository: CardRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async getActiveTimer(userId: string): Promise<ActiveTimer | null> {
    const entry = await this.timeEntryRepository.findActiveByUserId(userId);

    if (!entry) {
      return null;
    }

    return toActiveTimer(entry);
  }

  async startActivityTimer(
    teamId: string,
    activityId: string,
    userId: string,
  ): Promise<ActiveTimer> {
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

    const activeEntry = await this.timeEntryRepository.findActiveByUserId(userId);

    if (activeEntry?.cardId === activityId) {
      throw new AppError(400, MENSAGENS.TIMER_JA_ATIVO);
    }

    const startedAt = new Date();

    if (activeEntry) {
      await this.timeEntryRepository.stopEntry(activeEntry, startedAt);
    }

    const entry = await this.timeEntryRepository.startTimer({
      cardId: activityId,
      userId,
      startedAt,
    });

    return {
      timeEntry: toTimeEntrySummary(entry),
      activity: {
        id: card.id,
        title: card.title,
        teamId: card.teamId,
      },
    };
  }

  async pauseActiveTimer(userId: string): Promise<TimeEntrySummary> {
    const activeEntry = await this.timeEntryRepository.findActiveByUserId(userId);

    if (!activeEntry) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const stopped = await this.timeEntryRepository.stopEntry(
      activeEntry,
      new Date(),
    );

    return toTimeEntrySummary(stopped);
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

      const key =
        item.kind === 'TASK' ? `task:${item.id}` : `card:${item.id}`;

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
}

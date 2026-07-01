import type { TimeEntry } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import type {
  ActiveTimer,
  DayDashboard,
  DayTimelineBlock,
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

type DayEntry = Awaited<
  ReturnType<TimeEntryRepository['findOverlappingDay']>
>[number];

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
  const overlapEnd = new Date(
    Math.min(entryEnd.getTime(), dayEnd.getTime()),
  );

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
      title: entry.task.title,
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

  async getDayDashboard(userId: string, date?: string): Promise<DayDashboard> {
    const targetDate = date ?? formatDateKey(new Date());
    const { dayStart, dayEnd } = parseDayBounds(targetDate);
    const now = new Date();

    const previousDay = new Date(dayStart);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDate = formatDateKey(previousDay);
    const { dayStart: prevStart, dayEnd: prevEnd } = parseDayBounds(previousDate);

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
}

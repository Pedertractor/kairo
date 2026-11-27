import type {
  Prisma,
  PrismaClient,
  TimeEntryAuditAction,
  TimeEntryType,
  UserRole,
} from '../generated/client.js';
import { parseDayBounds } from '../utils/app-timezone.js';

type Db = PrismaClient | Prisma.TransactionClient;

export interface AdminTimeEntryFilters {
  userId?: string;
  teamId?: string;
  from?: string;
  to?: string;
  type?: TimeEntryType;
  activeOnly?: boolean;
}

export interface TimeEntryWriteData {
  cardId: string | null;
  taskId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  note: string | null;
}

export interface TimeEntryAuditWrite {
  timeEntryId: string;
  targetUserId: string;
  actorId: string;
  action: TimeEntryAuditAction;
  before: Prisma.InputJsonValue | null;
  after: Prisma.InputJsonValue | null;
}

export interface WorkItemAccess {
  id: string;
  /** The collaborator is a member of the item's team and the team is active. */
  userCanLog: boolean;
}

function teamAccessSelect(userId: string) {
  return {
    active: true,
    members: { where: { userId }, select: { userId: true }, take: 1 },
  } as const;
}

function canLog(team: { active: boolean; members: unknown[] }) {
  return team.active && team.members.length > 0;
}

const entryInclude = {
  user: { select: { id: true, name: true } },
  card: {
    select: {
      id: true,
      title: true,
      type: true,
      teamId: true,
      team: { select: { name: true } },
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      card: {
        select: {
          id: true,
          title: true,
          type: true,
          teamId: true,
          team: { select: { name: true } },
        },
      },
    },
  },
} as const satisfies Prisma.TimeEntryInclude;

export type AdminTimeEntryRecord = Prisma.TimeEntryGetPayload<{
  include: typeof entryInclude;
}>;

function durationSecondsOf(startedAt: Date, endedAt: Date | null) {
  return endedAt
    ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
    : null;
}

/**
 * Data access for the admin-only time entry management screen.
 *
 * Writes must go through `inUserTransaction`, which serialises every admin
 * write for one collaborator behind a Postgres advisory lock so overlap checks
 * cannot race each other.
 */
export class AdminTimeEntryRepository {
  constructor(private readonly db: Db) {}

  async inUserTransaction<T>(
    userId: string,
    fn: (repo: AdminTimeEntryRepository) => Promise<T>,
  ): Promise<T> {
    return (this.db as PrismaClient).$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`time-entry-admin:${userId}`}))`;
      return fn(new AdminTimeEntryRepository(tx));
    });
  }

  /**
   * Re-reads the actor inside the write transaction (row share lock), so a
   * demotion or deactivation committed mid-request blocks the write.
   */
  async lockActor(
    actorId: string,
  ): Promise<{ role: UserRole; active: boolean } | null> {
    const rows = await this.db.$queryRaw<
      { role: UserRole; active: boolean }[]
    >`SELECT role::text AS role, active FROM users WHERE id = ${actorId} FOR SHARE`;

    return rows[0] ?? null;
  }

  findUserById(id: string) {
    return this.db.user.findUnique({
      where: { id },
      select: { id: true, name: true, active: true },
    });
  }

  listUserOptions() {
    return this.db.user.findMany({
      select: {
        id: true,
        name: true,
        employeeId: true,
        active: true,
        role: true,
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  findEntryById(id: string) {
    return this.db.timeEntry.findUnique({
      where: { id },
      include: entryInclude,
    });
  }

  list(filters: AdminTimeEntryFilters, skip: number, take: number) {
    return this.db.timeEntry.findMany({
      where: this.buildWhere(filters),
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      include: entryInclude,
    });
  }

  count(filters: AdminTimeEntryFilters) {
    return this.db.timeEntry.count({ where: this.buildWhere(filters) });
  }

  /**
   * The activity plus whether `userId` could log time on it, i.e. belongs to
   * its (active) team — the same rule the regular timer applies.
   */
  async findActivity(cardId: string, userId: string): Promise<WorkItemAccess | null> {
    const card = await this.db.card.findFirst({
      where: { id: cardId, type: 'ACTIVITY', deletedAt: null },
      select: { id: true, team: { select: teamAccessSelect(userId) } },
    });
    return card ? { id: card.id, userCanLog: canLog(card.team) } : null;
  }

  async findTask(taskId: string, userId: string): Promise<WorkItemAccess | null> {
    const task = await this.db.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        card: { type: 'PROJECT', deletedAt: null },
      },
      select: {
        id: true,
        card: { select: { team: { select: teamAccessSelect(userId) } } },
      },
    });
    return task ? { id: task.id, userCanLog: canLog(task.card.team) } : null;
  }

  /** Activities of active teams `userId` is a member of. */
  searchActivities(
    userId: string,
    search: string | undefined,
    teamId: string | undefined,
    take: number,
  ) {
    return this.db.card.findMany({
      where: {
        type: 'ACTIVITY',
        deletedAt: null,
        team: { active: true, members: { some: { userId } } },
        ...(teamId ? { teamId } : {}),
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        teamId: true,
        team: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  /** Tasks of projects in active teams `userId` is a member of. */
  searchTasks(
    userId: string,
    search: string | undefined,
    teamId: string | undefined,
    take: number,
  ) {
    return this.db.task.findMany({
      where: {
        deletedAt: null,
        card: {
          type: 'PROJECT',
          deletedAt: null,
          team: { active: true, members: { some: { userId } } },
          ...(teamId ? { teamId } : {}),
        },
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { card: { title: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        card: {
          select: {
            id: true,
            title: true,
            teamId: true,
            team: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  /** Entries of the user whose interval intersects [startedAt, endedAt). */
  findOverlapping(
    userId: string,
    startedAt: Date,
    endedAt: Date | null,
    excludeId?: string,
  ) {
    return this.db.timeEntry.findFirst({
      where: {
        userId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(endedAt ? { startedAt: { lt: endedAt } } : {}),
        OR: [{ endedAt: null }, { endedAt: { gt: startedAt } }],
      },
      select: { id: true, startedAt: true, endedAt: true },
      orderBy: { startedAt: 'asc' },
    });
  }

  createManual(userId: string, data: TimeEntryWriteData) {
    return this.db.timeEntry.create({
      data: {
        userId,
        type: 'MANUAL',
        cardId: data.cardId,
        taskId: data.taskId,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        durationSeconds: durationSecondsOf(data.startedAt, data.endedAt),
        note: data.note,
      },
      include: entryInclude,
    });
  }

  update(id: string, data: TimeEntryWriteData) {
    return this.db.timeEntry.update({
      where: { id },
      data: {
        cardId: data.cardId,
        taskId: data.taskId,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        durationSeconds: durationSecondsOf(data.startedAt, data.endedAt),
        note: data.note,
      },
      include: entryInclude,
    });
  }

  delete(id: string) {
    return this.db.timeEntry.delete({ where: { id } });
  }

  writeAudit(log: TimeEntryAuditWrite) {
    return this.db.timeEntryAuditLog.create({
      data: {
        timeEntryId: log.timeEntryId,
        targetUserId: log.targetUserId,
        actorId: log.actorId,
        action: log.action,
        before: log.before ?? undefined,
        after: log.after ?? undefined,
      },
    });
  }

  findAuditByEntryId(timeEntryId: string) {
    return this.db.timeEntryAuditLog.findMany({
      where: { timeEntryId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true } } },
    });
  }

  private buildWhere(filters: AdminTimeEntryFilters): Prisma.TimeEntryWhereInput {
    const teamFilter = filters.teamId ? { teamId: filters.teamId } : {};
    const and: Prisma.TimeEntryWhereInput[] = [
      {
        OR: [
          { card: { deletedAt: null, ...teamFilter } },
          {
            task: {
              deletedAt: null,
              card: { deletedAt: null, ...teamFilter },
            },
          },
        ],
      },
    ];

    if (filters.userId) {
      and.push({ userId: filters.userId });
    }

    if (filters.type) {
      and.push({ type: filters.type });
    }

    if (filters.activeOnly) {
      and.push({ endedAt: null });
    }

    if (filters.to) {
      and.push({ startedAt: { lt: parseDayBounds(filters.to).dayEnd } });
    }

    if (filters.from) {
      const { dayStart } = parseDayBounds(filters.from);
      and.push({ OR: [{ endedAt: null }, { endedAt: { gt: dayStart } }] });
    }

    return { AND: and };
  }
}

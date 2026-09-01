import type { CardStatus } from '../generated/client.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import type {
  ActivityOverview,
  ActivityStatusCount,
  ActivityTypeAnalytics,
  AnalyticsDashboard,
  AnalyticsEmployeeOption,
  ClientAnalytics,
  EmployeeDayAnalytics,
} from '../types/analytics.types.js';
import { formatDateKey, parseDayBounds } from '../utils/app-timezone.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { getEntryDurationSeconds } from '../utils/time-entry-duration.js';

const DAILY_AVAILABILITY_SECONDS = 8 * 60 * 60 + 48 * 60;
const CARD_STATUSES: CardStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
];
const NONE_TAG_KEY = '__none__';

function emptyStatusCounts(): Map<CardStatus, number> {
  return new Map(CARD_STATUSES.map((status) => [status, 0]));
}

function toStatusCounts(
  counts: Map<CardStatus, number>,
): ActivityStatusCount[] {
  return CARD_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

function getPeriodBounds(
  startDate: string,
  endDate: string,
): { periodStart: Date; periodEnd: Date } {
  const { dayStart: periodStart } = parseDayBounds(startDate);
  const { dayEnd: periodEnd } = parseDayBounds(endDate);

  return { periodStart, periodEnd };
}

function getInclusiveDayCount(startDate: string, endDate: string): number {
  const { dayStart: start } = parseDayBounds(startDate);
  const { dayStart: end } = parseDayBounds(endDate);
  const diffMs = end.getTime() - start.getTime();

  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

function getInclusiveDayCountFromDates(
  start: Date,
  endInclusive: Date,
): number {
  const diffMs = endInclusive.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

function countAbsenceDaysInPeriod(
  absences: Array<{ startedAt: Date; endedAt: Date | null }>,
  periodStart: Date,
  periodEndExclusive: Date,
  now: Date,
): number {
  const todayStart = parseDayBounds(formatDateKey(now)).dayStart;
  const periodEndInclusive = new Date(periodEndExclusive);
  periodEndInclusive.setDate(periodEndInclusive.getDate() - 1);

  let totalDays = 0;

  for (const absence of absences) {
    const absenceEndInclusive = absence.endedAt ?? todayStart;
    const overlapStart =
      absence.startedAt.getTime() > periodStart.getTime()
        ? absence.startedAt
        : periodStart;
    const overlapEndInclusive =
      absenceEndInclusive.getTime() < periodEndInclusive.getTime()
        ? absenceEndInclusive
        : periodEndInclusive;

    if (overlapStart.getTime() > overlapEndInclusive.getTime()) {
      continue;
    }

    totalDays += getInclusiveDayCountFromDates(
      overlapStart,
      overlapEndInclusive,
    );
  }

  return totalDays;
}

function getOverlapSeconds(
  startedAt: Date,
  endedAt: Date | null,
  periodStart: Date,
  periodEnd: Date,
  now: Date,
): number {
  const start = Math.max(startedAt.getTime(), periodStart.getTime());
  const end = Math.min((endedAt ?? now).getTime(), periodEnd.getTime());

  return Math.max(0, Math.floor((end - start) / 1000));
}

export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly absenceRepository: AbsenceRepository,
  ) {}

  async getDashboard(
    ownerId: string,
    options: {
      startDate?: string;
      endDate?: string;
      teamId?: string;
      employeeId?: string;
      projectId?: string;
    },
  ): Promise<AnalyticsDashboard> {
    const ownedTeams = await this.repository.findOwnedTeams(ownerId);

    if (ownedTeams.length === 0) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (
      options.teamId &&
      !ownedTeams.some((team) => team.id === options.teamId)
    ) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const scopedTeams = options.teamId
      ? ownedTeams.filter((team) => team.id === options.teamId)
      : ownedTeams;
    const projects = await this.repository.findProjectsForTeams(
      scopedTeams.map((team) => team.id),
    );
    const selectedProject = options.projectId
      ? projects.find((project) => project.id === options.projectId)
      : undefined;

    if (options.projectId && !selectedProject) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const employeesById = new Map<
      string,
      {
        id: string;
        name: string;
        teamId: string;
        teamNames: Set<string>;
      }
    >();

    for (const team of scopedTeams) {
      for (const membership of team.members) {
        const current = employeesById.get(membership.user.id);

        if (current) {
          current.teamNames.add(team.name);
        } else {
          employeesById.set(membership.user.id, {
            id: membership.user.id,
            name: membership.user.name,
            teamId: team.id,
            teamNames: new Set([team.name]),
          });
        }
      }
    }

    const employees: AnalyticsEmployeeOption[] = [...employeesById.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

    if (options.employeeId && !employeesById.has(options.employeeId)) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    const todayKey = formatDateKey(new Date());
    const startDate = options.startDate ?? todayKey;
    const endDate = options.endDate ?? todayKey;
    const { periodStart, periodEnd } = getPeriodBounds(startDate, endDate);
    const dayCount = getInclusiveDayCount(startDate, endDate);
    const scopedTeamIds = scopedTeams.map((team) => team.id);
    const employeeIds = [...employeesById.keys()];
    const [
      entries,
      projectEntries,
      activityEntries,
      clientActivities,
      clientTasks,
      absencePeriods,
    ] = await Promise.all([
      this.repository.findEntriesForTeams(
        scopedTeamIds,
        periodStart,
        periodEnd,
        selectedProject?.id,
      ),
      selectedProject
        ? this.repository.findEntriesForProject(selectedProject.id)
        : Promise.resolve([]),
      this.repository.findActivityEntriesForTeams(
        scopedTeamIds,
        periodStart,
        periodEnd,
        options.employeeId,
      ),
      this.repository.findActivitiesForClientAnalytics(
        scopedTeamIds,
        periodStart,
        periodEnd,
        options.employeeId,
      ),
      this.repository.findTasksForClientAnalytics(
        scopedTeamIds,
        periodStart,
        periodEnd,
        options.employeeId,
      ),
      this.absenceRepository.findOverlappingRange(
        employeeIds,
        periodStart,
        periodEnd,
      ),
    ]);
    const now = new Date();
    const absencesByEmployee = new Map<
      string,
      Array<{ startedAt: Date; endedAt: Date | null }>
    >();

    for (const period of absencePeriods) {
      const list = absencesByEmployee.get(period.userId) ?? [];
      list.push({ startedAt: period.startedAt, endedAt: period.endedAt });
      absencesByEmployee.set(period.userId, list);
    }

    const availabilityByEmployee = new Map<string, number>();

    for (const employeeId of employeeIds) {
      const absenceDays = countAbsenceDaysInPeriod(
        absencesByEmployee.get(employeeId) ?? [],
        periodStart,
        periodEnd,
        now,
      );
      const availableDays = Math.max(0, dayCount - absenceDays);
      availabilityByEmployee.set(
        employeeId,
        DAILY_AVAILABILITY_SECONDS * availableDays,
      );
    }

    const totalsByEmployee = new Map<
      string,
      { loggedSeconds: number; timeEntryCount: number }
    >();

    for (const entry of entries) {
      if (!employeesById.has(entry.userId)) {
        continue;
      }

      const current = totalsByEmployee.get(entry.userId) ?? {
        loggedSeconds: 0,
        timeEntryCount: 0,
      };
      current.loggedSeconds += getOverlapSeconds(
        entry.startedAt,
        entry.endedAt,
        periodStart,
        periodEnd,
        now,
      );
      current.timeEntryCount += 1;
      totalsByEmployee.set(entry.userId, current);
    }

    const activityBuckets = new Map<
      string,
      {
        tagId: string | null;
        tagName: string;
        tagColor: string | null;
        entryCount: number;
        loggedSeconds: number;
        cardIds: Set<string>;
        members: Map<
          string,
          { employeeName: string; entryCount: number; loggedSeconds: number }
        >;
      }
    >();

    for (const entry of activityEntries) {
      if (!employeesById.has(entry.userId)) {
        continue;
      }

      if (options.employeeId && entry.userId !== options.employeeId) {
        continue;
      }

      if (!entry.card) {
        continue;
      }

      const tagId = entry.card.tagId;
      const bucketKey = tagId ?? NONE_TAG_KEY;
      const employee = employeesById.get(entry.userId)!;
      const overlapSeconds = getOverlapSeconds(
        entry.startedAt,
        entry.endedAt,
        periodStart,
        periodEnd,
        now,
      );

      const bucket = activityBuckets.get(bucketKey) ?? {
        tagId,
        tagName: entry.card.tag?.name ?? 'Sem etiqueta',
        tagColor: entry.card.tag?.color ?? null,
        entryCount: 0,
        loggedSeconds: 0,
        cardIds: new Set<string>(),
        members: new Map(),
      };

      bucket.entryCount += 1;
      bucket.loggedSeconds += overlapSeconds;
      if (entry.cardId) {
        bucket.cardIds.add(entry.cardId);
      }

      const member = bucket.members.get(entry.userId) ?? {
        employeeName: employee.name,
        entryCount: 0,
        loggedSeconds: 0,
      };
      member.entryCount += 1;
      member.loggedSeconds += overlapSeconds;
      bucket.members.set(entry.userId, member);
      activityBuckets.set(bucketKey, bucket);
    }

    const activityTypes: ActivityTypeAnalytics[] = [...activityBuckets.entries()]
      .map(([key, bucket]) => ({
        tagId: bucket.tagId,
        tagName: bucket.tagName,
        tagColor: bucket.tagColor,
        entryCount: bucket.entryCount,
        activityCount: bucket.cardIds.size,
        loggedSeconds: bucket.loggedSeconds,
        members: [...bucket.members.entries()]
          .map(([employeeId, member]) => ({
            employeeId,
            employeeName: member.employeeName,
            entryCount: member.entryCount,
            loggedSeconds: member.loggedSeconds,
          }))
          .sort((a, b) => b.loggedSeconds - a.loggedSeconds),
        _isNone: key === NONE_TAG_KEY,
      }))
      .sort((a, b) => {
        if (a._isNone !== b._isNone) {
          return a._isNone ? 1 : -1;
        }
        return b.loggedSeconds - a.loggedSeconds;
      })
      .map(({ _isNone: _, ...row }) => row);

    const NONE_CLIENT_KEY = '__none__';
    const clientBuckets = new Map<
      string,
      {
        clientId: string | null;
        clientName: string;
        activityCount: number;
        taskCount: number;
        entryCount: number;
        loggedSeconds: number;
      }
    >();

    function ensureClientBucket(
      clientId: string | null,
      clientName: string | null | undefined,
    ) {
      const bucketKey = clientId ?? NONE_CLIENT_KEY;
      const existing = clientBuckets.get(bucketKey);
      if (existing) {
        return existing;
      }

      const bucket = {
        clientId,
        clientName: clientName ?? 'Sem cliente',
        activityCount: 0,
        taskCount: 0,
        entryCount: 0,
        loggedSeconds: 0,
      };
      clientBuckets.set(bucketKey, bucket);
      return bucket;
    }

    const overviewStatusCounts = emptyStatusCounts();
    const overviewTagBuckets = new Map<
      string,
      {
        tagId: string | null;
        tagName: string;
        tagColor: string | null;
        count: number;
        statusCounts: Map<CardStatus, number>;
      }
    >();

    for (const activity of clientActivities) {
      const bucket = ensureClientBucket(
        activity.clientId,
        activity.client?.name,
      );
      bucket.activityCount += 1;

      overviewStatusCounts.set(
        activity.status,
        (overviewStatusCounts.get(activity.status) ?? 0) + 1,
      );

      const tagKey = activity.tagId ?? NONE_TAG_KEY;
      const tagBucket = overviewTagBuckets.get(tagKey) ?? {
        tagId: activity.tagId,
        tagName: activity.tag?.name ?? 'Sem etiqueta',
        tagColor: activity.tag?.color ?? null,
        count: 0,
        statusCounts: emptyStatusCounts(),
      };
      tagBucket.count += 1;
      tagBucket.statusCounts.set(
        activity.status,
        (tagBucket.statusCounts.get(activity.status) ?? 0) + 1,
      );
      overviewTagBuckets.set(tagKey, tagBucket);
    }

    const activityOverview: ActivityOverview = {
      total: clientActivities.length,
      byStatus: toStatusCounts(overviewStatusCounts),
      byTag: [...overviewTagBuckets.entries()]
        .map(([key, bucket]) => ({
          tagId: bucket.tagId,
          tagName: bucket.tagName,
          tagColor: bucket.tagColor,
          count: bucket.count,
          byStatus: toStatusCounts(bucket.statusCounts),
          _isNone: key === NONE_TAG_KEY,
        }))
        .sort((a, b) => {
          if (a._isNone !== b._isNone) {
            return a._isNone ? 1 : -1;
          }
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.tagName.localeCompare(b.tagName);
        })
        .map(({ _isNone: _, ...row }) => row),
    };

    for (const task of clientTasks) {
      const bucket = ensureClientBucket(
        task.card.clientId,
        task.card.client?.name,
      );
      bucket.taskCount += 1;
    }

    for (const entry of activityEntries) {
      if (!employeesById.has(entry.userId)) {
        continue;
      }

      if (options.employeeId && entry.userId !== options.employeeId) {
        continue;
      }

      if (!entry.card) {
        continue;
      }

      const overlapSeconds = getOverlapSeconds(
        entry.startedAt,
        entry.endedAt,
        periodStart,
        periodEnd,
        now,
      );
      const bucket = ensureClientBucket(
        entry.card.clientId,
        entry.card.client?.name,
      );
      bucket.entryCount += 1;
      bucket.loggedSeconds += overlapSeconds;
    }

    const clients: ClientAnalytics[] = [...clientBuckets.entries()]
      .map(([key, bucket]) => ({
        clientId: bucket.clientId,
        clientName: bucket.clientName,
        activityCount: bucket.activityCount,
        taskCount: bucket.taskCount,
        entryCount: bucket.entryCount,
        loggedSeconds: bucket.loggedSeconds,
        _isNone: key === NONE_CLIENT_KEY,
      }))
      .sort((a, b) => {
        if (a._isNone !== b._isNone) {
          return a._isNone ? 1 : -1;
        }
        if (b.activityCount !== a.activityCount) {
          return b.activityCount - a.activityCount;
        }
        if (b.taskCount !== a.taskCount) {
          return b.taskCount - a.taskCount;
        }
        return b.loggedSeconds - a.loggedSeconds;
      })
      .map(({ _isNone: _, ...row }) => row);

    const rows: EmployeeDayAnalytics[] = [...employeesById.values()]
      .filter(
        (employee) =>
          !options.employeeId || employee.id === options.employeeId,
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((employee) => {
        const totals = totalsByEmployee.get(employee.id) ?? {
          loggedSeconds: 0,
          timeEntryCount: 0,
        };
        const availabilitySeconds = availabilityByEmployee.get(employee.id) ?? 0;

        return {
          employeeId: employee.id,
          employeeName: employee.name,
          teamId: employee.teamId,
          teamNames: [...employee.teamNames].sort(),
          availabilitySeconds,
          loggedSeconds: totals.loggedSeconds,
          remainingSeconds: Math.max(
            0,
            availabilitySeconds - totals.loggedSeconds,
          ),
          timeEntryCount: totals.timeEntryCount,
          utilizationPercent:
            availabilitySeconds > 0
              ? Math.round((totals.loggedSeconds / availabilitySeconds) * 100)
              : 0,
        };
      });

    const summary = rows.reduce(
      (total, row) => ({
        availabilitySeconds:
          total.availabilitySeconds + row.availabilitySeconds,
        loggedSeconds: total.loggedSeconds + row.loggedSeconds,
        remainingSeconds: total.remainingSeconds + row.remainingSeconds,
        timeEntryCount: total.timeEntryCount + row.timeEntryCount,
        utilizationPercent: 0,
      }),
      {
        availabilitySeconds: 0,
        loggedSeconds: 0,
        remainingSeconds: 0,
        timeEntryCount: 0,
        utilizationPercent: 0,
      },
    );
    summary.utilizationPercent =
      summary.availabilitySeconds > 0
        ? Math.round(
            (summary.loggedSeconds / summary.availabilitySeconds) * 100,
          )
        : 0;

    const estimatedSeconds = selectedProject?.estimatedHours
      ? Math.round(Number(selectedProject.estimatedHours) * 60 * 60)
      : null;
    const projectTotalsByEmployee = new Map<
      string,
      { employeeName: string; spentSeconds: number }
    >();

    for (const entry of projectEntries) {
      if (!employeesById.has(entry.userId)) {
        continue;
      }

      if (options.employeeId && entry.userId !== options.employeeId) {
        continue;
      }

      const current = projectTotalsByEmployee.get(entry.userId) ?? {
        employeeName: entry.user.name,
        spentSeconds: 0,
      };
      current.spentSeconds += getEntryDurationSeconds(entry, now);
      projectTotalsByEmployee.set(entry.userId, current);
    }

    const projectUsers = [...projectTotalsByEmployee.entries()]
      .map(([employeeId, total]) => ({
        employeeId,
        employeeName: total.employeeName,
        spentSeconds: total.spentSeconds,
        estimatedTimePercent:
          estimatedSeconds && estimatedSeconds > 0
            ? Math.round((total.spentSeconds / estimatedSeconds) * 100)
            : null,
      }))
      .sort((a, b) => b.spentSeconds - a.spentSeconds);
    const projectSpentSeconds = projectUsers.reduce(
      (total, user) => total + user.spentSeconds,
      0,
    );

    return {
      startDate,
      endDate,
      teams: ownedTeams.map(({ id, name }) => ({ id, name })),
      employees,
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        teamId: project.teamId,
        teamName: project.team.name,
      })),
      selectedProject: selectedProject
        ? {
            id: selectedProject.id,
            title: selectedProject.title,
            teamId: selectedProject.teamId,
            teamName: selectedProject.team.name,
            estimatedSeconds,
            spentSeconds: projectSpentSeconds,
            estimatedTimePercent:
              estimatedSeconds && estimatedSeconds > 0
                ? Math.round(
                    (projectSpentSeconds / estimatedSeconds) * 100,
                  )
                : null,
            users: projectUsers,
          }
        : null,
      summary,
      rows,
      activityTypes,
      clients,
      activityOverview,
    };
  }
}

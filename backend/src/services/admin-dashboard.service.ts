import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import type {
  AdminDashboard,
  AdminDailyUsage,
  AdminNamedCount,
  AdminStatusCount,
  AdminTeamUsage,
  AdminUserUsage,
} from '../types/admin-dashboard.types.js';
import {
  formatDateKey,
  parseDayBounds,
  shiftDateKey,
} from '../utils/app-timezone.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { calculateAvailabilitySeconds } from '../utils/work-availability.js';

const DEFAULT_PERIOD_DAYS = 30;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  LEADER: 'Líder',
  USER: 'Usuário',
};

const UNIT_LABELS: Record<string, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
};

const CARD_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
] as const;

function getPeriodBounds(startDate: string, endDate: string) {
  const { dayStart: periodStart } = parseDayBounds(startDate);
  const { dayEnd: periodEnd } = parseDayBounds(endDate);

  return { periodStart, periodEnd };
}

function listDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }

  return keys;
}

function allocateEntryToDays(
  startedAt: Date,
  endedAt: Date | null,
  periodStart: Date,
  periodEnd: Date,
  now: Date,
  userId: string,
  daily: Map<string, AdminDailyUsage>,
  usersByDay: Map<string, Set<string>>,
) {
  let cursor = Math.max(startedAt.getTime(), periodStart.getTime());
  const end = Math.min((endedAt ?? now).getTime(), periodEnd.getTime());
  let countedEntry = false;

  while (cursor < end) {
    const dateKey = formatDateKey(new Date(cursor));
    const { dayEnd } = parseDayBounds(dateKey);
    const sliceEnd = Math.min(dayEnd.getTime(), end);
    const seconds = Math.max(0, Math.floor((sliceEnd - cursor) / 1000));
    const bucket = daily.get(dateKey);

    if (bucket && seconds > 0) {
      bucket.loggedSeconds += seconds;
      if (!countedEntry) {
        bucket.entryCount += 1;
        countedEntry = true;
      }

      const set = usersByDay.get(dateKey) ?? new Set<string>();
      set.add(userId);
      usersByDay.set(dateKey, set);
    }

    cursor = sliceEnd;
  }
}

function fillStatusCounts(
  statuses: readonly string[],
  counts: Map<string, number>,
): AdminStatusCount[] {
  return statuses.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

export class AdminDashboardService {
  constructor(private readonly repository: AdminDashboardRepository) {}

  async getDashboard(options: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<AdminDashboard> {
    const todayKey = formatDateKey(new Date());
    const startDate =
      options.startDate ?? shiftDateKey(todayKey, -(DEFAULT_PERIOD_DAYS - 1));
    const endDate = options.endDate ?? todayKey;
    const { periodStart, periodEnd } = getPeriodBounds(startDate, endDate);
    const now = new Date();

    const users = await this.repository.findUsers();
    const selectedUser = options.userId
      ? (users.find((user) => user.id === options.userId) ?? null)
      : null;

    if (options.userId && !selectedUser) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    const scopedUserIds = selectedUser
      ? [selectedUser.id]
      : users.filter((user) => user.active).map((user) => user.id);

    const [
      teams,
      clientCount,
      cardGroups,
      taskGroups,
      createdProjects,
      createdActivities,
      createdTasks,
      entries,
      runningTimers,
      absences,
    ] = await Promise.all([
      this.repository.findTeams(),
      this.repository.countClients(),
      this.repository.groupCardsByTypeAndStatus(selectedUser?.id),
      this.repository.groupTasksByStatus(selectedUser?.id),
      this.repository.countCreatedCards(
        periodStart,
        periodEnd,
        'PROJECT',
        selectedUser?.id,
      ),
      this.repository.countCreatedCards(
        periodStart,
        periodEnd,
        'ACTIVITY',
        selectedUser?.id,
      ),
      this.repository.countCreatedTasks(
        periodStart,
        periodEnd,
        selectedUser?.id,
      ),
      this.repository.findTimeEntries(periodStart, periodEnd, selectedUser?.id),
      this.repository.findRunningTimers(selectedUser?.id),
      this.repository.findAbsences(scopedUserIds, periodStart, periodEnd),
    ]);

    const absencesByUser = new Map<
      string,
      Array<{ startedAt: Date; endedAt: Date | null }>
    >();

    for (const period of absences) {
      const list = absencesByUser.get(period.userId) ?? [];
      list.push({ startedAt: period.startedAt, endedAt: period.endedAt });
      absencesByUser.set(period.userId, list);
    }

    const availabilityByUser = new Map<string, number>();

    for (const userId of scopedUserIds) {
      availabilityByUser.set(
        userId,
        calculateAvailabilitySeconds(
          absencesByUser.get(userId) ?? [],
          periodStart,
          periodEnd,
          now,
        ),
      );
    }

    const totalsByUser = new Map<
      string,
      { loggedSeconds: number; timeEntryCount: number }
    >();
    const totalsByTeam = new Map<
      string,
      { loggedSeconds: number; timeEntryCount: number }
    >();
    const entryTypes = {
      TIMER: { type: 'TIMER' as const, count: 0, loggedSeconds: 0 },
      MANUAL: { type: 'MANUAL' as const, count: 0, loggedSeconds: 0 },
    };
    const daily = new Map<string, AdminDailyUsage>(
      listDateKeys(startDate, endDate).map((date) => [
        date,
        { date, loggedSeconds: 0, entryCount: 0, activeUserCount: 0 },
      ]),
    );
    const usersByDay = new Map<string, Set<string>>();

    let loggedSeconds = 0;

    for (const entry of entries) {
      const overlapStart = Math.max(entry.startedAt.getTime(), periodStart.getTime());
      const overlapEnd = Math.min(
        (entry.endedAt ?? now).getTime(),
        periodEnd.getTime(),
      );
      const seconds = Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));

      loggedSeconds += seconds;
      entryTypes[entry.type].count += 1;
      entryTypes[entry.type].loggedSeconds += seconds;

      const userTotals = totalsByUser.get(entry.userId) ?? {
        loggedSeconds: 0,
        timeEntryCount: 0,
      };
      userTotals.loggedSeconds += seconds;
      userTotals.timeEntryCount += 1;
      totalsByUser.set(entry.userId, userTotals);

      const teamId = entry.card?.teamId ?? entry.task?.card.teamId;
      if (teamId) {
        const teamTotals = totalsByTeam.get(teamId) ?? {
          loggedSeconds: 0,
          timeEntryCount: 0,
        };
        teamTotals.loggedSeconds += seconds;
        teamTotals.timeEntryCount += 1;
        totalsByTeam.set(teamId, teamTotals);
      }

      allocateEntryToDays(
        entry.startedAt,
        entry.endedAt,
        periodStart,
        periodEnd,
        now,
        entry.userId,
        daily,
        usersByDay,
      );
    }

    for (const [date, bucket] of daily) {
      bucket.activeUserCount = usersByDay.get(date)?.size ?? 0;
    }

    const projectStatusCounts = new Map<string, number>();
    const activityStatusCounts = new Map<string, number>();
    let projectCount = 0;
    let activityCount = 0;

    for (const group of cardGroups) {
      if (group.type === 'PROJECT') {
        projectCount += group._count._all;
        projectStatusCounts.set(group.status, group._count._all);
      } else {
        activityCount += group._count._all;
        activityStatusCounts.set(group.status, group._count._all);
      }
    }

    const taskStatusCounts = new Map<string, number>();
    let taskCount = 0;

    for (const group of taskGroups) {
      taskCount += group._count._all;
      taskStatusCounts.set(group.status, group._count._all);
    }

    const scopedUsers = selectedUser ? [selectedUser] : users;
    const activeScoped = scopedUsers.filter((user) => user.active);
    const availabilitySeconds = [...availabilityByUser.values()].reduce(
      (total, value) => total + value,
      0,
    );
    const remainingSeconds = Math.max(0, availabilitySeconds - loggedSeconds);
    const timeEntryCount = entries.length;

    const roleCounts = new Map<string, number>();
    const unitCounts = new Map<string, number>();

    for (const user of scopedUsers) {
      roleCounts.set(user.role, (roleCounts.get(user.role) ?? 0) + 1);
      unitCounts.set(user.unit, (unitCounts.get(user.unit) ?? 0) + 1);
    }

    const usersByRole: AdminNamedCount[] = ['ADMIN', 'LEADER', 'USER'].map(
      (role) => ({
        key: role,
        label: ROLE_LABELS[role],
        count: roleCounts.get(role) ?? 0,
      }),
    );
    const usersByUnit: AdminNamedCount[] = ['PEDERTRACTOR', 'TRACTOR'].map(
      (unit) => ({
        key: unit,
        label: UNIT_LABELS[unit],
        count: unitCounts.get(unit) ?? 0,
      }),
    );

    const userUsage: AdminUserUsage[] = scopedUsers
      .map((user) => {
        const totals = totalsByUser.get(user.id) ?? {
          loggedSeconds: 0,
          timeEntryCount: 0,
        };
        const availability = availabilityByUser.get(user.id) ?? 0;

        return {
          userId: user.id,
          name: user.name,
          role: user.role,
          unit: user.unit,
          active: user.active,
          loggedSeconds: totals.loggedSeconds,
          timeEntryCount: totals.timeEntryCount,
          availabilitySeconds: availability,
          utilizationPercent:
            availability > 0
              ? Math.round((totals.loggedSeconds / availability) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.loggedSeconds - a.loggedSeconds);

    const teamUsage: AdminTeamUsage[] = teams
      .map((team) => {
        const totals = totalsByTeam.get(team.id) ?? {
          loggedSeconds: 0,
          timeEntryCount: 0,
        };
        const projectCards = team.cards.filter((card) => card.type === 'PROJECT')
          .length;
        const activityCards = team.cards.filter(
          (card) => card.type === 'ACTIVITY',
        ).length;

        return {
          teamId: team.id,
          name: team.name,
          active: team.active,
          memberCount: team._count.members,
          projectCount: projectCards,
          activityCount: activityCards,
          loggedSeconds: totals.loggedSeconds,
          timeEntryCount: totals.timeEntryCount,
        };
      })
      .sort((a, b) => b.loggedSeconds - a.loggedSeconds);

    const documentCount = teams.reduce(
      (total, team) => total + team._count.documents,
      0,
    );
    const createdUsers = users.filter(
      (user) => user.createdAt >= periodStart && user.createdAt < periodEnd,
    ).length;

    return {
      startDate,
      endDate,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        unit: user.unit,
        role: user.role,
        active: user.active,
        absent: user.absent,
      })),
      selectedUser: selectedUser
        ? {
            id: selectedUser.id,
            name: selectedUser.name,
            employeeId: selectedUser.employeeId,
            unit: selectedUser.unit,
            role: selectedUser.role,
            active: selectedUser.active,
            absent: selectedUser.absent,
          }
        : null,
      summary: {
        userCount: scopedUsers.length,
        activeUsers: activeScoped.length,
        inactiveUsers: scopedUsers.filter((user) => !user.active).length,
        absentUsers: scopedUsers.filter((user) => user.absent).length,
        pendingFirstLogin: scopedUsers.filter((user) => user.firstLogin).length,
        usersWithEntries: totalsByUser.size,
        teamCount: teams.length,
        activeTeams: teams.filter((team) => team.active).length,
        inactiveTeams: teams.filter((team) => !team.active).length,
        projectCount,
        activityCount,
        taskCount,
        clientCount,
        documentCount,
        loggedSeconds,
        availabilitySeconds,
        remainingSeconds,
        utilizationPercent:
          availabilitySeconds > 0
            ? Math.round((loggedSeconds / availabilitySeconds) * 100)
            : 0,
        timeEntryCount,
        averageEntrySeconds:
          timeEntryCount > 0 ? Math.round(loggedSeconds / timeEntryCount) : 0,
        runningTimerCount: runningTimers.length,
        createdProjects,
        createdActivities,
        createdTasks,
        createdUsers: selectedUser ? 0 : createdUsers,
      },
      usersByRole,
      usersByUnit,
      projectStatus: fillStatusCounts(CARD_STATUSES, projectStatusCounts),
      activityStatus: fillStatusCounts(CARD_STATUSES, activityStatusCounts),
      taskStatus: fillStatusCounts(CARD_STATUSES, taskStatusCounts),
      daily: [...daily.values()],
      topUsers: userUsage.slice(0, 12),
      teams: teamUsage,
      entryTypes: [entryTypes.TIMER, entryTypes.MANUAL],
      runningTimers: runningTimers.map((timer) => ({
        id: timer.id,
        userId: timer.userId,
        userName: timer.user.name,
        startedAt: timer.startedAt.toISOString(),
        itemTitle: timer.task?.title ?? timer.card?.title ?? 'Item',
        itemKind: timer.task
          ? 'task'
          : timer.card?.type === 'PROJECT'
            ? 'project'
            : 'activity',
      })),
    };
  }
}

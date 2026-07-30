import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import type {
  AnalyticsDashboard,
  AnalyticsEmployeeOption,
  EmployeeDayAnalytics,
} from '../types/analytics.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { getEntryDurationSeconds } from '../utils/time-entry-duration.js';

const DAILY_AVAILABILITY_SECONDS = 8 * 60 * 60 + 48 * 60;

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getPeriodBounds(
  startDate: string,
  endDate: string,
): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date(`${startDate}T00:00:00.000`);
  const periodEnd = new Date(`${endDate}T00:00:00.000`);
  periodEnd.setDate(periodEnd.getDate() + 1);

  return { periodStart, periodEnd };
}

function getInclusiveDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T00:00:00.000`);
  const diffMs = end.getTime() - start.getTime();

  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
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
  constructor(private readonly repository: AnalyticsRepository) {}

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
    const availabilitySeconds = DAILY_AVAILABILITY_SECONDS * dayCount;
    const [entries, projectEntries] = await Promise.all([
      this.repository.findEntriesForTeams(
        scopedTeams.map((team) => team.id),
        periodStart,
        periodEnd,
        selectedProject?.id,
      ),
      selectedProject
        ? this.repository.findEntriesForProject(selectedProject.id)
        : Promise.resolve([]),
    ]);
    const now = new Date();
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
          utilizationPercent: Math.round(
            (totals.loggedSeconds / availabilitySeconds) * 100,
          ),
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
    };
  }
}

import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import type {
  AnalyticsDashboard,
  AnalyticsEmployeeOption,
  EmployeeDayAnalytics,
} from '../types/analytics.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

const DAILY_AVAILABILITY_SECONDS = 8 * 60 * 60 + 48 * 60;

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDayBounds(date: string): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(`${date}T00:00:00.000`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return { dayStart, dayEnd };
}

function getOverlapSeconds(
  startedAt: Date,
  endedAt: Date | null,
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): number {
  const start = Math.max(startedAt.getTime(), dayStart.getTime());
  const end = Math.min((endedAt ?? now).getTime(), dayEnd.getTime());

  return Math.max(0, Math.floor((end - start) / 1000));
}

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getDashboard(
    ownerId: string,
    options: { date?: string; teamId?: string; employeeId?: string },
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
    const employeesById = new Map<
      string,
      { id: string; name: string; teamNames: Set<string> }
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

    const date = options.date ?? formatDateKey(new Date());
    const { dayStart, dayEnd } = getDayBounds(date);
    const entries = await this.repository.findEntriesForTeams(
      scopedTeams.map((team) => team.id),
      dayStart,
      dayEnd,
    );
    const now = new Date();
    const totalsByEmployee = new Map<
      string,
      { loggedSeconds: number; timeEntryCount: number }
    >();

    for (const entry of entries) {
      const current = totalsByEmployee.get(entry.userId) ?? {
        loggedSeconds: 0,
        timeEntryCount: 0,
      };
      current.loggedSeconds += getOverlapSeconds(
        entry.startedAt,
        entry.endedAt,
        dayStart,
        dayEnd,
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
          teamNames: [...employee.teamNames].sort(),
          availabilitySeconds: DAILY_AVAILABILITY_SECONDS,
          loggedSeconds: totals.loggedSeconds,
          remainingSeconds: Math.max(
            0,
            DAILY_AVAILABILITY_SECONDS - totals.loggedSeconds,
          ),
          timeEntryCount: totals.timeEntryCount,
          utilizationPercent: Math.round(
            (totals.loggedSeconds / DAILY_AVAILABILITY_SECONDS) * 100,
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

    return {
      date,
      teams: ownedTeams.map(({ id, name }) => ({ id, name })),
      employees,
      summary,
      rows,
    };
  }
}

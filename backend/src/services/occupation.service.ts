import { OccupationRepository } from '../repositories/occupation.repository.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import type { OccupationResponse } from '../types/occupation.types.js';
import { formatDateKey, parseDayBounds, shiftDateKey } from '../utils/app-timezone.js';
import { WorkDayCalendar, widenForWorkDays } from '../utils/work-day.js';

function getMonthBounds(month: string) {
  const startDate = `${month}-01`;
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth =
    monthNumber === 12
      ? `${year + 1}-01`
      : `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
  const { dayStart: periodStart } = parseDayBounds(startDate);
  const { dayStart: periodEnd } = parseDayBounds(`${nextMonth}-01`);

  return { periodStart, periodEnd };
}

interface DayRange {
  date: string;
  start: number;
  end: number;
}

export class OccupationService {
  constructor(
    private readonly repository: OccupationRepository,
    private readonly shiftRepository: Pick<ShiftRepository, 'findOverlappingRange'>,
  ) {}

  async getMonthlyOccupation(month: string): Promise<OccupationResponse> {
    const { periodStart, periodEnd } = getMonthBounds(month);
    // Overnight workers count by work day (utils/work-day.ts), which can
    // extend past calendar midnight, so entries are loaded one day wider.
    const { queryStart, queryEnd } = widenForWorkDays(periodStart, periodEnd);
    const now = new Date();
    const days: DayRange[] = [];

    for (
      let date = `${month}-01`;
      date.startsWith(`${month}-`);
      date = shiftDateKey(date, 1)
    ) {
      const { dayStart, dayEnd } = parseDayBounds(date);
      days.push({ date, start: dayStart.getTime(), end: dayEnd.getTime() });
    }

    const members = await this.repository.findActiveNonLeaderMembers();
    const userIds = members.map((member) => member.id);
    const [entries, shiftPeriods] = await Promise.all([
      this.repository.findTimeEntries(userIds, queryStart, queryEnd),
      this.shiftRepository.findOverlappingRange(userIds, periodStart, queryEnd),
    ]);
    const shiftsByUser = new Map<string, typeof shiftPeriods>();

    for (const period of shiftPeriods) {
      const list = shiftsByUser.get(period.userId) ?? [];
      list.push(period);
      shiftsByUser.set(period.userId, list);
    }

    const daysByUser = new Map<string, DayRange[]>();
    const daysFor = (userId: string): DayRange[] => {
      const cached = daysByUser.get(userId);

      if (cached) {
        return cached;
      }

      const calendar = new WorkDayCalendar(shiftsByUser.get(userId) ?? []);
      const userDays = calendar.isShifted
        ? days.map((day) => ({ date: day.date, ...calendar.dayBounds(day.date) }))
        : days;
      daysByUser.set(userId, userDays);

      return userDays;
    };
    const secondsByUser = new Map<string, Record<string, number>>();

    for (const entry of entries) {
      const userDays = daysFor(entry.userId);
      const start = Math.max(entry.startedAt.getTime(), userDays[0].start);
      const end = Math.min(
        (entry.endedAt ?? now).getTime(),
        userDays[userDays.length - 1].end,
      );

      if (end <= start) {
        continue;
      }

      const totals = secondsByUser.get(entry.userId) ?? {};
      for (const day of userDays) {
        const seconds = Math.max(
          0,
          Math.floor((Math.min(end, day.end) - Math.max(start, day.start)) / 1000),
        );
        if (seconds > 0) {
          totals[day.date] = (totals[day.date] ?? 0) + seconds;
        }
      }
      secondsByUser.set(entry.userId, totals);
    }

    return {
      month,
      members: members.map((member) => {
        const totals = secondsByUser.get(member.id);
        const hoursByDate = Object.fromEntries(
          days.map((day) => [
            day.date,
            Math.round(((totals?.[day.date] ?? 0) / 3600) * 10_000) / 10_000,
          ]),
        );

        return {
          cardNumber: member.cardNumber,
          unit: member.unit,
          name: member.name,
          role: member.role as 'ADMIN' | 'USER',
          userCreatedAt: member.createdAt.toISOString(),
          firstAppointmentDate: member.timeEntries[0]
            ? formatDateKey(member.timeEntries[0].startedAt)
            : null,
          hoursByDate,
        };
      }),
    };
  }
}

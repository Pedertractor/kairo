import { OccupationRepository } from '../repositories/occupation.repository.js';
import type { OccupationResponse } from '../types/occupation.types.js';
import { parseDayBounds, shiftDateKey } from '../utils/app-timezone.js';

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

export class OccupationService {
  constructor(private readonly repository: OccupationRepository) {}

  async getMonthlyOccupation(month: string): Promise<OccupationResponse> {
    const { periodStart, periodEnd } = getMonthBounds(month);
    const now = new Date();
    const days: Array<{ date: string; start: number; end: number }> = [];

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
    const entries = await this.repository.findTimeEntries(
      userIds,
      periodStart,
      periodEnd,
    );
    const secondsByUser = new Map<string, Record<string, number>>();

    for (const entry of entries) {
      const start = Math.max(entry.startedAt.getTime(), periodStart.getTime());
      const end = Math.min((entry.endedAt ?? now).getTime(), periodEnd.getTime());

      if (end <= start) {
        continue;
      }

      const totals = secondsByUser.get(entry.userId) ?? {};
      for (const day of days) {
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
          hoursByDate,
        };
      }),
    };
  }
}

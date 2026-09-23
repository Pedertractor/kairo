import { OccupationRepository } from '../repositories/occupation.repository.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import type { OccupationResponse } from '../types/occupation.types.js';
import { parseDayBounds } from '../utils/app-timezone.js';
import { calculateAvailabilitySeconds } from '../utils/work-availability.js';

function getMonthBounds(month: string) {
  const startDate = `${month}-01`;
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth =
    monthNumber === 12
      ? `${year + 1}-01`
      : `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
  const endDate = `${nextMonth}-01`;

  const { dayStart: periodStart } = parseDayBounds(startDate);
  const { dayStart: periodEnd } = parseDayBounds(endDate);

  return { periodStart, periodEnd };
}

export class OccupationService {
  constructor(
    private readonly repository: OccupationRepository,
    private readonly shiftRepository: ShiftRepository,
  ) {}

  async getMonthlyOccupation(month: string): Promise<OccupationResponse> {
    const { periodStart, periodEnd } = getMonthBounds(month);
    const now = new Date();

    const members = await this.repository.findActiveNonLeaderMembers();
    const userIds = members.map((member) => member.id);

    const [entries, absences, shiftPeriods] = await Promise.all([
      this.repository.findTimeEntries(userIds, periodStart, periodEnd),
      this.repository.findAbsences(userIds, periodStart, periodEnd),
      this.shiftRepository.findOverlappingRange(
        userIds,
        periodStart,
        periodEnd,
      ),
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

    const shiftsByUser = new Map<
      string,
      Array<{
        startMinutes: number;
        endMinutes: number;
        startedAt: Date;
        endedAt: Date | null;
      }>
    >();

    for (const period of shiftPeriods) {
      const list = shiftsByUser.get(period.userId) ?? [];
      list.push({
        startMinutes: period.startMinutes,
        endMinutes: period.endMinutes,
        startedAt: period.startedAt,
        endedAt: period.endedAt,
      });
      shiftsByUser.set(period.userId, list);
    }

    const loggedByUser = new Map<string, number>();

    for (const entry of entries) {
      const overlapStart = Math.max(
        entry.startedAt.getTime(),
        periodStart.getTime(),
      );
      const overlapEnd = Math.min(
        (entry.endedAt ?? now).getTime(),
        periodEnd.getTime(),
      );
      const seconds = Math.max(
        0,
        Math.floor((overlapEnd - overlapStart) / 1000),
      );

      if (seconds === 0) {
        continue;
      }

      loggedByUser.set(
        entry.userId,
        (loggedByUser.get(entry.userId) ?? 0) + seconds,
      );
    }

    return {
      month,
      members: members.map((member) => {
        const availabilitySeconds = calculateAvailabilitySeconds(
          absencesByUser.get(member.id) ?? [],
          periodStart,
          periodEnd,
          now,
          shiftsByUser.get(member.id) ?? [],
        );
        const loggedSeconds = loggedByUser.get(member.id) ?? 0;

        return {
          cardNumber: member.cardNumber,
          unit: member.unit,
          name: member.name,
          role: member.role as 'ADMIN' | 'USER',
          loggedSeconds,
          availabilitySeconds,
          occupationPercent:
            availabilitySeconds > 0
              ? Math.round((loggedSeconds / availabilitySeconds) * 100)
              : 0,
        };
      }),
    };
  }
}

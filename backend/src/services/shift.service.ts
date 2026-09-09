import { ShiftSource } from '../generated/client.js';
import { EmployeeService } from './employee.service.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { formatMinutesToTime, parseShiftBounds } from '../utils/shift.js';

export const SHIFT_SYNC_JOB_NAME = 'shift-sync';
export const SHIFT_SYNC_INTERVAL_MS = 15 * 24 * 60 * 60 * 1000;

export type CurrentShift = {
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
};

export class ShiftService {
  private readonly employeeService = new EmployeeService();

  constructor(private readonly shiftRepository: ShiftRepository) {}

  toCurrentShift(
    period: { startMinutes: number; endMinutes: number } | null | undefined,
  ): CurrentShift | null {
    if (!period) {
      return null;
    }

    return {
      start: formatMinutesToTime(period.startMinutes),
      end: formatMinutesToTime(period.endMinutes),
      startMinutes: period.startMinutes,
      endMinutes: period.endMinutes,
    };
  }

  async getCurrentByUserId(userId: string): Promise<CurrentShift | null> {
    const period = await this.shiftRepository.findCurrentByUserId(userId);
    return this.toCurrentShift(period);
  }

  async getCurrentByUserIds(
    userIds: string[],
  ): Promise<Map<string, CurrentShift>> {
    const periods = await this.shiftRepository.findCurrentByUserIds(userIds);
    const map = new Map<string, CurrentShift>();

    for (const period of periods) {
      if (map.has(period.userId)) {
        continue;
      }

      const current = this.toCurrentShift(period);

      if (current) {
        map.set(period.userId, current);
      }
    }

    return map;
  }

  async setManualShift(
    userId: string,
    start: string,
    end: string,
  ): Promise<CurrentShift> {
    const bounds = parseShiftBounds(start, end);

    if (!bounds) {
      throw new AppError(400, MENSAGENS.TURNO_INVALIDO);
    }

    const result = await this.shiftRepository.replaceCurrentPeriod({
      userId,
      startMinutes: bounds.startMinutes,
      endMinutes: bounds.endMinutes,
      source: ShiftSource.MANUAL,
    });

    return this.toCurrentShift(result.period)!;
  }

  async syncFromExternal(): Promise<{ synced: number; updated: number }> {
    const shifts = await this.employeeService.listShifts();
    const users = await this.shiftRepository.findAllUsersWithCurrentShift();
    const usersByKey = new Map(
      users.map((user) => [`${user.unit}:${user.cardNumber}`, user]),
    );

    let updated = 0;

    for (const shift of shifts) {
      const user = usersByKey.get(`${shift.unit}:${shift.cardNumber}`);

      if (!user) {
        continue;
      }

      const result = await this.shiftRepository.replaceCurrentPeriod({
        userId: user.id,
        startMinutes: shift.startMinutes,
        endMinutes: shift.endMinutes,
        source: ShiftSource.API,
      });

      if (result.changed) {
        updated += 1;
      }
    }

    await this.shiftRepository.upsertJob(SHIFT_SYNC_JOB_NAME, new Date());

    return { synced: shifts.length, updated };
  }

  async shouldRunScheduledSync(now = new Date()): Promise<boolean> {
    const job = await this.shiftRepository.getJob(SHIFT_SYNC_JOB_NAME);

    if (!job) {
      return true;
    }

    return now.getTime() - job.lastRunAt.getTime() >= SHIFT_SYNC_INTERVAL_MS;
  }

  async runScheduledSyncIfDue(): Promise<{
    ran: boolean;
    synced?: number;
    updated?: number;
  }> {
    const due = await this.shouldRunScheduledSync();

    if (!due) {
      return { ran: false };
    }

    const result = await this.syncFromExternal();

    return { ran: true, ...result };
  }
}

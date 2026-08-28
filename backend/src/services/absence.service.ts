import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { User } from '../generated/client.js';
import { formatDateKey, isDateKey, parseDayBounds } from '../utils/app-timezone.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { releaseActivityIfIdle } from './card-status-sync.js';
import { releaseTaskIfIdle } from './task-status-sync.js';

export interface SetAbsentOptions {
  startDate?: string;
  endDate?: string | null;
  createdById: string;
}

function parseDateKey(dateKey: string): Date {
  if (!isDateKey(dateKey)) {
    throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
  }

  return parseDayBounds(dateKey).dayStart;
}

function startOfToday(): Date {
  return parseDateKey(formatDateKey(new Date()));
}

function coversToday(startedAt: Date, endedAt: Date | null, today: Date): boolean {
  if (startedAt.getTime() > today.getTime()) {
    return false;
  }

  if (endedAt === null) {
    return true;
  }

  return endedAt.getTime() >= today.getTime();
}

export class AbsenceService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly absenceRepository: AbsenceRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly taskRepository: TaskRepository,
    private readonly cardRepository: CardRepository,
  ) {}

  async isCurrentlyAbsent(userId: string): Promise<boolean> {
    const open = await this.absenceRepository.findOpenByUserId(userId);
    if (!open) {
      return false;
    }

    return open.startedAt.getTime() <= startOfToday().getTime();
  }

  async setAbsent(
    userId: string,
    absent: boolean,
    options: SetAbsentOptions,
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    if (absent) {
      return this.openPeriod(user, options);
    }

    return this.closePeriod(user, options);
  }

  private async openPeriod(
    user: User,
    options: SetAbsentOptions,
  ): Promise<User> {
    const today = startOfToday();
    const startDate = options.startDate ?? formatDateKey(today);
    const startedAt = parseDateKey(startDate);

    if (startedAt.getTime() > today.getTime()) {
      throw new AppError(400, MENSAGENS.AUSENCIA_INICIO_FUTURO);
    }

    let endedAt: Date | null = null;
    if (options.endDate !== undefined && options.endDate !== null) {
      endedAt = parseDateKey(options.endDate);
      if (endedAt.getTime() < startedAt.getTime()) {
        throw new AppError(400, MENSAGENS.AUSENCIA_FIM_ANTES_INICIO);
      }
    }

    const open = await this.absenceRepository.findOpenByUserId(user.id);
    if (open) {
      throw new AppError(400, MENSAGENS.AUSENCIA_JA_ATIVA);
    }

    const overlapping = await this.absenceRepository.findOverlapping(
      user.id,
      startedAt,
      endedAt,
    );
    if (overlapping) {
      throw new AppError(400, MENSAGENS.AUSENCIA_SOBREPOSTA);
    }

    await this.absenceRepository.create({
      userId: user.id,
      startedAt,
      endedAt,
      createdById: options.createdById,
    });

    const currentlyAbsent = coversToday(startedAt, endedAt, today);
    const updated = await this.userRepository.setAbsent(
      user.id,
      currentlyAbsent,
    );

    if (currentlyAbsent) {
      const activeEntry =
        await this.timeEntryRepository.findActiveByUserId(user.id);

      if (activeEntry) {
        await this.timeEntryRepository.stopEntry(activeEntry, new Date());
        await releaseTaskIfIdle(
          this.timeEntryRepository,
          this.taskRepository,
          activeEntry.taskId,
        );
        await releaseActivityIfIdle(
          this.timeEntryRepository,
          this.cardRepository,
          activeEntry.cardId,
        );
      }
    }

    return updated;
  }

  private async closePeriod(
    user: User,
    options: SetAbsentOptions,
  ): Promise<User> {
    const endDate = options.endDate ?? formatDateKey(new Date());
    const endedAt = parseDateKey(endDate);

    const open = await this.absenceRepository.findOpenByUserId(user.id);
    if (!open) {
      throw new AppError(400, MENSAGENS.AUSENCIA_NAO_ATIVA);
    }

    if (endedAt.getTime() < open.startedAt.getTime()) {
      throw new AppError(400, MENSAGENS.AUSENCIA_FIM_ANTES_INICIO);
    }

    await this.absenceRepository.close(open.id, endedAt);

    return this.userRepository.setAbsent(user.id, false);
  }
}

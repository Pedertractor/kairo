import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { User } from '../generated/client.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { releaseActivityIfIdle } from './card-status-sync.js';
import { releaseTaskIfIdle } from './task-status-sync.js';

export interface SetAbsentOptions {
  startDate?: string;
  endDate?: string | null;
  createdById: string;
}

function parseDateTime(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
  }

  return date;
}

function coversNow(startedAt: Date, endedAt: Date | null, now: Date): boolean {
  if (startedAt.getTime() > now.getTime()) {
    return false;
  }

  return endedAt === null || endedAt.getTime() > now.getTime();
}

export class AbsenceService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly absenceRepository: AbsenceRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly taskRepository: TaskRepository,
    private readonly cardRepository: CardRepository,
  ) {}

  getCurrentPeriod(userId: string, now = new Date()) {
    return this.absenceRepository.findCoveringOn(userId, now);
  }

  async isCurrentlyAbsent(userId: string): Promise<boolean> {
    return (await this.getCurrentPeriod(userId)) !== null;
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

    return this.closePeriod(user);
  }

  private async openPeriod(
    user: User,
    options: SetAbsentOptions,
  ): Promise<User> {
    const now = new Date();
    const startedAt = options.startDate
      ? parseDateTime(options.startDate)
      : now;

    if (startedAt.getTime() > now.getTime()) {
      throw new AppError(400, MENSAGENS.AUSENCIA_INICIO_FUTURO);
    }

    let endedAt: Date | null = null;
    if (options.endDate !== undefined && options.endDate !== null) {
      endedAt = parseDateTime(options.endDate);
      if (endedAt.getTime() <= startedAt.getTime()) {
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

    const currentlyAbsent = coversNow(startedAt, endedAt, now);
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

  private async closePeriod(user: User): Promise<User> {
    const now = new Date();
    const covering = await this.absenceRepository.findCoveringOn(user.id, now);

    if (covering) {
      await this.absenceRepository.close(covering.id, now);
    }

    return this.userRepository.setAbsent(user.id, false);
  }
}

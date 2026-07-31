import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { releaseTaskIfIdle } from './task-status-sync.js';

export class AbsenceService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly taskRepository: TaskRepository,
  ) {}

  async setAbsent(userId: string, absent: boolean) {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    const updated = await this.userRepository.setAbsent(userId, absent);

    if (!absent) {
      return updated;
    }

    const activeEntry =
      await this.timeEntryRepository.findActiveByUserId(userId);

    if (activeEntry) {
      await this.timeEntryRepository.stopEntry(activeEntry, new Date());
      await releaseTaskIfIdle(
        this.timeEntryRepository,
        this.taskRepository,
        activeEntry.taskId,
      );
    }

    return updated;
  }
}

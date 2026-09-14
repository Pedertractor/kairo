import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { releaseActivityIfIdle } from './card-status-sync.js';
import { releaseTaskIfIdle } from './task-status-sync.js';

export async function stopUnfinishedTimeEntriesForUser(
  timeEntryRepository: TimeEntryRepository,
  taskRepository: TaskRepository,
  cardRepository: CardRepository,
  userId: string,
  options?: { teamId?: string },
): Promise<void> {
  const entries = await timeEntryRepository.findUnfinishedByUserId(userId);
  const endedAt = new Date();

  for (const entry of entries) {
    const entryTeamId = entry.card?.teamId ?? entry.task?.card.teamId ?? null;

    if (options?.teamId && entryTeamId !== options.teamId) {
      continue;
    }

    await timeEntryRepository.stopEntry(entry, endedAt);
    await releaseTaskIfIdle(
      timeEntryRepository,
      taskRepository,
      entry.taskId,
    );
    await releaseActivityIfIdle(
      timeEntryRepository,
      cardRepository,
      entry.cardId,
    );
  }
}

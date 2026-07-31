import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';

/**
 * Moves a task back to PAUSED once nobody is timing it anymore.
 *
 * Several people may time the same task at once, so the task only leaves
 * IN_PROGRESS when the last running timer stops. Callers must close the
 * relevant time entry before calling this, otherwise it still counts.
 */
export async function releaseTaskIfIdle(
  timeEntryRepository: TimeEntryRepository,
  taskRepository: TaskRepository,
  taskId: string | null | undefined,
): Promise<void> {
  if (!taskId) {
    return;
  }

  const remaining = await timeEntryRepository.countActiveByTaskId(taskId);

  if (remaining > 0) {
    return;
  }

  await taskRepository.updateStatusIfOpen(taskId, 'PAUSED');
}

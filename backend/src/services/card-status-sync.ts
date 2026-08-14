import { CardRepository } from '../repositories/card.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';

/**
 * Moves an activity back to PAUSED once nobody is timing it anymore.
 *
 * Several people may time the same activity at once, so the activity only
 * leaves IN_PROGRESS when the last running timer stops. Callers must close
 * the relevant time entry before calling this, otherwise it still counts.
 */
export async function releaseActivityIfIdle(
  timeEntryRepository: TimeEntryRepository,
  cardRepository: CardRepository,
  cardId: string | null | undefined,
): Promise<void> {
  if (!cardId) {
    return;
  }

  const remaining = await timeEntryRepository.countActiveByCardId(cardId);

  if (remaining > 0) {
    return;
  }

  await cardRepository.updateStatusIfOpen(cardId, 'PAUSED');
}

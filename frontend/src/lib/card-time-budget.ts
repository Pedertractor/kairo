export type TimeBudgetStatus = 'none' | 'ok' | 'near' | 'over'

export function parseEstimatedHoursToSeconds(
  estimatedHours: string,
): number {
  const parsed = Number.parseFloat(estimatedHours)

  if (Number.isNaN(parsed) || parsed <= 0) {
    return 0
  }

  return Math.round(parsed * 3600)
}

export function getTimeBudgetStatus(
  loggedSeconds: number,
  estimatedHours: string | null,
): TimeBudgetStatus {
  if (!estimatedHours) {
    return 'none'
  }

  const estimatedSeconds = parseEstimatedHoursToSeconds(estimatedHours)

  if (estimatedSeconds <= 0) {
    return 'none'
  }

  const ratio = loggedSeconds / estimatedSeconds

  if (ratio >= 1) {
    return 'over'
  }

  if (ratio >= 0.8) {
    return 'near'
  }

  return 'ok'
}

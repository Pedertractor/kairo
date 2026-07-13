export function formatLoggedDuration(
  totalSeconds: number,
  options?: { includeSeconds?: boolean },
): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const base = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`

  if (!options?.includeSeconds) {
    return base
  }

  const seconds = totalSeconds % 60

  return `${base} ${String(seconds).padStart(2, '0')}s`
}

export function formatChangePercent(changePercent: number | null): string | null {
  if (changePercent === null) {
    return null
  }

  const sign = changePercent > 0 ? '+' : ''

  return `${sign}${changePercent}%`
}

export function formatLoggedDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

export function formatChangePercent(changePercent: number | null): string | null {
  if (changePercent === null) {
    return null
  }

  const sign = changePercent > 0 ? '+' : ''

  return `${sign}${changePercent}%`
}

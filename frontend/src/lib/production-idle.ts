export const PRODUCTION_IDLE_MS = 15_000
export const PRODUCTION_DEADLINE_KEY = 'kairo:production-expires-at'

export function remainingIdleSeconds(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function filterProductionActivities<T extends { title: string }>(activities: T[], name: string): T[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const term = normalize(name.trim())
  return activities.filter((activity) => normalize(activity.title).includes(term))
}

export function isProductionActivityClosed(status: string): boolean {
  return status === 'DONE' || status === 'CANCELED'
}

export function sortProductionActivities<T extends { id: string; title: string; status: string; lastWorkedAt?: string | null }>(
  activities: T[],
  activeActivityId: string | null,
  recentStarts: Record<string, string> = {},
): T[] {
  const lastWorked = (activity: T) => Math.max(
    Date.parse(activity.lastWorkedAt ?? '') || 0,
    Date.parse(recentStarts[activity.id] ?? '') || 0,
  )
  return [...activities].sort((a, b) => {
    const closed = Number(isProductionActivityClosed(a.status)) - Number(isProductionActivityClosed(b.status))
    if (closed !== 0) return closed
    const active = Number(b.id === activeActivityId) - Number(a.id === activeActivityId)
    if (active !== 0) return active
    return lastWorked(b) - lastWorked(a) || a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id)
  })
}

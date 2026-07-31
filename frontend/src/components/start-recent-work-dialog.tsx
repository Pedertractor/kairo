import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  ListTodo,
  Loader2,
  Play,
  Star,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActiveTimer } from '@/hooks/use-active-timer'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { CARD_STATUS_BADGE_CLASS, STATUS_LABELS } from '@/lib/card-status'
import {
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_LABELS,
} from '@/lib/task-status'
import { cn } from '@/lib/utils'
import type {
  ActivitiesListResponse,
  ActivitySummary,
} from '@/types/card'
import type {
  FavoriteWorkItem,
  FavoritesListResponse,
} from '@/types/favorite'
import type { TeamsListResponse } from '@/types/team'
import type {
  RecentWorkItem,
  RecentWorkItemsResponse,
} from '@/types/time-entry'

type DialogTab = 'favoritos' | 'recentes' | 'atividades'

type StartableKind = 'ACTIVITY' | 'TASK'

interface StartableWorkItem {
  kind: StartableKind
  id: string
  title: string
  teamId: string
  teamName: string
  status: string
  parentTitle: string | null
  canStartTimer: boolean
  activityId: string | null
  projectId: string | null
  taskId: string | null
}

const KIND_CONFIG: Record<
  StartableKind,
  { label: string; icon: typeof ClipboardList; className: string }
> = {
  ACTIVITY: {
    label: 'Atividade',
    icon: ClipboardList,
    className: 'bg-sidebar-primary/10 text-sidebar-primary',
  },
  TASK: {
    label: 'Tarefa',
    icon: ListTodo,
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
}

const TAB_EMPTY: Record<
  DialogTab,
  { title: string; description: string; linkLabel?: string; linkTo?: string }
> = {
  favoritos: {
    title: 'Nenhum favorito ainda',
    description:
      'Favorite atividades ou tarefas para iniciá-las rapidamente por aqui.',
  },
  recentes: {
    title: 'Nenhuma atividade ou tarefa recente',
    description:
      'Quando você apontar tempo em uma atividade ou tarefa, ela aparecerá aqui.',
    linkLabel: 'Ir para equipes',
    linkTo: '/equipes',
  },
  atividades: {
    title: 'Nenhuma atividade encontrada',
    description:
      'As atividades das suas equipes aparecerão aqui para iniciar o timer.',
    linkLabel: 'Ir para equipes',
    linkTo: '/equipes',
  },
}

function canStartFromStatus(status: string) {
  return !['DONE', 'CANCELED'].includes(status)
}

function toStartableFromFavorite(item: FavoriteWorkItem): StartableWorkItem {
  return {
    kind: item.kind,
    id: item.id,
    title: item.title,
    teamId: item.teamId,
    teamName: item.teamName,
    status: item.status,
    parentTitle: item.parentTitle,
    canStartTimer: item.canStartTimer && canStartFromStatus(item.status),
    activityId: item.activityId,
    projectId: item.projectId,
    taskId: item.taskId,
  }
}

function toStartableFromRecent(item: RecentWorkItem): StartableWorkItem | null {
  if (item.kind !== 'ACTIVITY' && item.kind !== 'TASK') {
    return null
  }

  return {
    kind: item.kind,
    id: item.id,
    title: item.title,
    teamId: item.teamId,
    teamName: item.teamName,
    status: item.status,
    parentTitle: item.parentTitle,
    canStartTimer: item.canStartTimer && canStartFromStatus(item.status),
    activityId: item.activityId,
    projectId: item.projectId,
    taskId: item.taskId,
  }
}

function toStartableFromActivity(
  activity: ActivitySummary,
  teamName: string,
): StartableWorkItem {
  return {
    kind: 'ACTIVITY',
    id: activity.id,
    title: activity.title,
    teamId: activity.teamId,
    teamName,
    status: activity.status,
    parentTitle: null,
    canStartTimer: canStartFromStatus(activity.status),
    activityId: activity.id,
    projectId: null,
    taskId: null,
  }
}

function getStatusLabel(item: StartableWorkItem): string {
  if (item.kind === 'TASK') {
    return (
      TASK_STATUS_LABELS[item.status as keyof typeof TASK_STATUS_LABELS] ??
      item.status
    )
  }

  return STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status
}

function getStatusBadgeClass(
  item: StartableWorkItem,
  isTimerRunning: boolean,
  isTimerPaused: boolean,
): string {
  if (isTimerRunning) {
    return CARD_STATUS_BADGE_CLASS.IN_PROGRESS
  }

  if (isTimerPaused) {
    return CARD_STATUS_BADGE_CLASS.PAUSED
  }

  if (item.kind === 'TASK') {
    return (
      TASK_STATUS_BADGE_CLASS[
        item.status as keyof typeof TASK_STATUS_BADGE_CLASS
      ] ?? 'bg-muted text-muted-foreground'
    )
  }

  return (
    CARD_STATUS_BADGE_CLASS[
      item.status as keyof typeof CARD_STATUS_BADGE_CLASS
    ] ?? 'bg-muted text-muted-foreground'
  )
}

function getItemHref(item: StartableWorkItem): string | null {
  if (item.kind === 'ACTIVITY' && item.activityId) {
    return `/equipes/${item.teamId}/atividades/${item.activityId}`
  }

  if (item.kind === 'TASK' && item.projectId && item.taskId) {
    return `/projetos/${item.projectId}/tarefas/${item.taskId}`
  }

  return null
}

function isItemRunning(
  item: StartableWorkItem,
  isActivityActive: (activityId: string) => boolean,
  isTaskActive: (taskId: string) => boolean,
): boolean {
  if (item.kind === 'ACTIVITY' && item.activityId) {
    return isActivityActive(item.activityId)
  }

  if (item.kind === 'TASK' && item.taskId) {
    return isTaskActive(item.taskId)
  }

  return false
}

function isItemPaused(
  item: StartableWorkItem,
  isActivityPaused: (activityId: string) => boolean,
  isTaskPaused: (taskId: string) => boolean,
): boolean {
  if (item.kind === 'ACTIVITY' && item.activityId) {
    return isActivityPaused(item.activityId)
  }

  if (item.kind === 'TASK' && item.taskId) {
    return isTaskPaused(item.taskId)
  }

  return false
}

function isItemCurrent(
  item: StartableWorkItem,
  isActivityCurrent: (activityId: string) => boolean,
  isTaskCurrent: (taskId: string) => boolean,
): boolean {
  if (item.kind === 'ACTIVITY' && item.activityId) {
    return isActivityCurrent(item.activityId)
  }

  if (item.kind === 'TASK' && item.taskId) {
    return isTaskCurrent(item.taskId)
  }

  return false
}

function WorkItemListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border p-3"
        >
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>
      ))}
    </div>
  )
}

function WorkItemEmptyState({
  tab,
  onClose,
}: {
  tab: DialogTab
  onClose: () => void
}) {
  const empty = TAB_EMPTY[tab]
  const Icon = tab === 'favoritos' ? Star : ClipboardList

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center">
      <Icon className="size-7 text-muted-foreground/70" />
      <p className="text-sm font-medium">{empty.title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {empty.description}
      </p>
      {empty.linkTo && empty.linkLabel ? (
        <Link
          to={empty.linkTo}
          className="mt-1 text-sm font-medium text-sidebar-primary hover:underline"
          onClick={onClose}
        >
          {empty.linkLabel}
        </Link>
      ) : null}
    </div>
  )
}

function WorkItemList({
  items,
  startingItemKey,
  onStart,
  onClose,
}: {
  items: StartableWorkItem[]
  startingItemKey: string | null
  onStart: (item: StartableWorkItem) => void
  onClose: () => void
}) {
  const {
    isActivityActive,
    isTaskActive,
    isActivityPaused,
    isTaskPaused,
    isActivityCurrent,
    isTaskCurrent,
  } = useActiveTimer()

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const config = KIND_CONFIG[item.kind]
        const Icon = config.icon
        const href = getItemHref(item)
        const isTimerRunning = isItemRunning(
          item,
          isActivityActive,
          isTaskActive,
        )
        const isTimerPaused = isItemPaused(
          item,
          isActivityPaused,
          isTaskPaused,
        )
        const isTimerCurrent = isItemCurrent(
          item,
          isActivityCurrent,
          isTaskCurrent,
        )
        const itemKey = `${item.kind}-${item.id}`
        const isStarting = startingItemKey === itemKey
        const statusLabel = isTimerRunning
          ? 'Em andamento'
          : isTimerPaused
            ? 'Pausado'
            : getStatusLabel(item)
        const canStart =
          item.canStartTimer && !isTimerRunning && !startingItemKey

        return (
          <li
            key={itemKey}
            className={cn(
              'flex items-center gap-3 rounded-xl border bg-card p-3',
              isTimerCurrent &&
                'border-sidebar-primary shadow-md shadow-sidebar-primary/15 ring-1 ring-sidebar-primary/35',
            )}
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                config.className,
              )}
            >
              <Icon className="size-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                {config.label}
                {item.parentTitle ? ` · ${item.parentTitle}` : ''}
              </p>
              {href ? (
                <Link
                  to={href}
                  className="block truncate text-sm font-medium hover:underline"
                  onClick={onClose}
                >
                  {item.title}
                </Link>
              ) : (
                <p className="truncate text-sm font-medium">{item.title}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {item.teamName}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {canStart ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 text-muted-foreground hover:text-sidebar-primary"
                  aria-label={`Iniciar ${config.label.toLowerCase()}`}
                  disabled={isStarting}
                  onClick={() => onStart(item)}
                >
                  {isStarting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Play />
                  )}
                </Button>
              ) : null}

              <span
                className={cn(
                  getStatusBadgeClass(item, isTimerRunning, isTimerPaused),
                  'rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                )}
              >
                {statusLabel}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

interface StartRecentWorkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted?: () => void
}

export function StartRecentWorkDialog({
  open,
  onOpenChange,
  onStarted,
}: StartRecentWorkDialogProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<DialogTab>('favoritos')
  const [favorites, setFavorites] = useState<StartableWorkItem[]>([])
  const [recents, setRecents] = useState<StartableWorkItem[]>([])
  const [activities, setActivities] = useState<StartableWorkItem[]>([])
  const [loadedTabs, setLoadedTabs] = useState<
    Partial<Record<DialogTab, boolean>>
  >({})
  const [startingItemKey, setStartingItemKey] = useState<string | null>(null)
  const { startTimer, startTaskTimer } = useActiveTimer()

  useEffect(() => {
    if (!open) {
      setActiveTab('favoritos')
      setLoadedTabs({})
      setFavorites([])
      setRecents([])
      setActivities([])
      setStartingItemKey(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || loadedTabs[activeTab]) {
      return
    }

    let cancelled = false

    async function loadTab(tab: DialogTab) {
      try {
        if (tab === 'favoritos') {
          const data = await api<FavoritesListResponse>('/favorites', {
            toastOnError: false,
          })

          if (!cancelled) {
            setFavorites(data.favorites.map(toStartableFromFavorite))
          }
        } else if (tab === 'recentes') {
          const data = await api<RecentWorkItemsResponse>(
            '/time-entries/recent',
            { toastOnError: false },
          )

          if (!cancelled) {
            setRecents(
              data.items
                .map(toStartableFromRecent)
                .filter((item): item is StartableWorkItem => item !== null),
            )
          }
        } else {
          const teamsData = await api<TeamsListResponse>('/teams', {
            toastOnError: false,
          })

          const activityLists = await Promise.all(
            teamsData.teams.map(async (team) => {
              const data = await api<ActivitiesListResponse>(
                `/teams/${team.id}/activities`,
                { toastOnError: false },
              )

              return data.activities.map((activity) =>
                toStartableFromActivity(activity, team.name),
              )
            }),
          )

          if (!cancelled) {
            setActivities(
              activityLists
                .flat()
                .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
            )
          }
        }

        if (!cancelled) {
          setLoadedTabs((current) => ({ ...current, [tab]: true }))
        }
      } catch {
        if (!cancelled) {
          setLoadedTabs((current) => ({ ...current, [tab]: true }))
        }
      }
    }

    void loadTab(activeTab)

    return () => {
      cancelled = true
    }
  }, [open, activeTab, loadedTabs])

  async function handleStart(item: StartableWorkItem) {
    if (user?.absent) {
      return
    }

    const itemKey = `${item.kind}-${item.id}`
    setStartingItemKey(itemKey)

    try {
      if (item.kind === 'ACTIVITY' && item.activityId) {
        await startTimer(item.teamId, item.activityId)
      } else if (item.kind === 'TASK' && item.projectId && item.taskId) {
        await startTaskTimer(item.projectId, item.taskId)
      } else {
        return
      }

      onOpenChange(false)
      onStarted?.()
    } finally {
      setStartingItemKey(null)
    }
  }

  function renderTabContent(tab: DialogTab, items: StartableWorkItem[]) {
    if (user?.absent) {
      return (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Você está marcado como ausente</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Altere seu status nas configurações para iniciar um apontamento.
          </p>
        </div>
      )
    }

    if (!loadedTabs[tab]) {
      return <WorkItemListSkeleton />
    }

    if (items.length === 0) {
      return (
        <WorkItemEmptyState tab={tab} onClose={() => onOpenChange(false)} />
      )
    }

    return (
      <WorkItemList
        items={items}
        startingItemKey={startingItemKey}
        onStart={(item) => void handleStart(item)}
        onClose={() => onOpenChange(false)}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>Iniciar apontamento</DialogTitle>
          <DialogDescription>
            Escolha um favorito, um item recente ou uma atividade para iniciar
            o timer.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as DialogTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 px-6 pt-3">
            <TabsList className="border-sidebar-border">
              <TabsTrigger
                value="favoritos"
                className="data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary"
              >
                Favoritos
              </TabsTrigger>
              <TabsTrigger
                value="recentes"
                className="data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary"
              >
                Recentes
              </TabsTrigger>
              <TabsTrigger
                value="atividades"
                className="data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary"
              >
                Atividades
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="favoritos" className="min-h-112">
              {renderTabContent('favoritos', favorites)}
            </TabsContent>
            <TabsContent value="recentes" className="min-h-112">
              {renderTabContent('recentes', recents)}
            </TabsContent>
            <TabsContent value="atividades" className="min-h-112">
              {renderTabContent('atividades', activities)}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

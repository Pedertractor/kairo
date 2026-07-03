import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  ListTodo,
  Loader2,
  Play,
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
import { useActiveTimer } from '@/hooks/use-active-timer'
import { api } from '@/lib/api-handler'
import { STATUS_LABELS } from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type {
  RecentWorkItem,
  RecentWorkItemKind,
  RecentWorkItemsResponse,
} from '@/types/time-entry'

const KIND_CONFIG: Record<
  RecentWorkItemKind,
  { label: string; icon: typeof ClipboardList; className: string }
> = {
  ACTIVITY: {
    label: 'Atividade',
    icon: ClipboardList,
    className: 'bg-sidebar-primary/10 text-sidebar-primary',
  },
  PROJECT: {
    label: 'Projeto',
    icon: ClipboardList,
    className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  TASK: {
    label: 'Tarefa',
    icon: ListTodo,
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
}

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluído',
  CANCELED: 'Cancelado',
}

function getStatusLabel(item: RecentWorkItem): string {
  if (item.kind === 'TASK') {
    return TASK_STATUS_LABELS[item.status] ?? item.status
  }

  return STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status
}

function getItemHref(item: RecentWorkItem): string | null {
  if (item.kind === 'ACTIVITY' && item.activityId) {
    return `/equipes/${item.teamId}/atividades/${item.activityId}`
  }

  if (item.kind === 'TASK' && item.projectId && item.taskId) {
    return `/projetos/${item.projectId}/tarefas/${item.taskId}`
  }

  return null
}

function isItemActive(
  item: RecentWorkItem,
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
  const [items, setItems] = useState<RecentWorkItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [startingItemKey, setStartingItemKey] = useState<string | null>(null)
  const {
    startTimer,
    startTaskTimer,
    isActivityActive,
    isTaskActive,
  } = useActiveTimer()

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadRecentItems() {
      setIsLoading(true)

      try {
        const data = await api<RecentWorkItemsResponse>('/time-entries/recent', {
          toastOnError: false,
        })

        if (!cancelled) {
          setItems(
            data.items.filter(
              (item) => item.kind === 'ACTIVITY' || item.kind === 'TASK',
            ),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadRecentItems()

    return () => {
      cancelled = true
    }
  }, [open])

  async function handleStart(item: RecentWorkItem) {
    const itemKey = `${item.kind}-${item.id}`
    setStartingItemKey(itemKey)

    try {
      if (item.kind === 'ACTIVITY' && item.activityId) {
        await startTimer(item.teamId, item.activityId)
      } else if (
        item.kind === 'TASK' &&
        item.projectId &&
        item.taskId
      ) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Iniciar apontamento</DialogTitle>
          <DialogDescription>
            Escolha uma atividade ou tarefa recente para iniciar o timer.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl border p-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="size-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <ClipboardList className="size-7 text-muted-foreground/70" />
              <p className="text-sm font-medium">
                Nenhuma atividade ou tarefa recente
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Quando você apontar tempo em uma atividade ou tarefa, ela
                aparecerá aqui.
              </p>
              <Link
                to="/equipes"
                className="mt-1 text-sm font-medium text-sidebar-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Ir para equipes
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const config = KIND_CONFIG[item.kind]
                const Icon = config.icon
                const href = getItemHref(item)
                const isActive = isItemActive(
                  item,
                  isActivityActive,
                  isTaskActive,
                )
                const itemKey = `${item.kind}-${item.id}`
                const isStarting = startingItemKey === itemKey
                const statusLabel = isActive ? 'Em andamento' : getStatusLabel(item)
                const canStart =
                  item.canStartTimer && !isActive && !startingItemKey

                return (
                  <li
                    key={itemKey}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
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
                          onClick={() => onOpenChange(false)}
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium">
                          {item.title}
                        </p>
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
                          onClick={() => void handleStart(item)}
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
                          'rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                          isActive
                            ? 'bg-sidebar-primary/10 text-sidebar-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

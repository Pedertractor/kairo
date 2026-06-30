import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  FolderKanban,
  ListTodo,
  Play,
} from 'lucide-react'

import { StartActivityTimerButton } from '@/components/start-activity-timer-button'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_LABELS } from '@/lib/card-status'
import { formatRelativeDate } from '@/lib/greeting'
import { api } from '@/lib/api-handler'
import { cn } from '@/lib/utils'
import { useActiveTimer } from '@/hooks/use-active-timer'
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
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  PROJECT: {
    label: 'Projeto',
    icon: FolderKanban,
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

  return `/equipes/${item.teamId}`
}

function RecentWorkItemRow({ item }: { item: RecentWorkItem }) {
  const { isActivityActive } = useActiveTimer()
  const config = KIND_CONFIG[item.kind]
  const Icon = config.icon
  const href = getItemHref(item)
  const isTimerActive =
    item.activityId !== null && isActivityActive(item.activityId)

  return (
    <li
      className={cn(
        'group flex flex-col gap-3 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between',
        isTimerActive && 'text-sidebar-primary',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            config.className,
          )}
        >
          <Icon className="size-4.5" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {config.label}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {getStatusLabel(item)}
            </span>
          </div>

          {href ? (
            <Link
              to={href}
              className="block truncate text-sm font-medium hover:underline sm:text-base"
            >
              {item.title}
            </Link>
          ) : (
            <p className="truncate text-sm font-medium sm:text-base">
              {item.title}
            </p>
          )}

          <p className="text-xs text-muted-foreground sm:text-sm">
            {item.parentTitle ? (
              <>
                <span className="font-medium text-foreground/80">
                  {item.parentTitle}
                </span>
                <span className="mx-1.5">·</span>
              </>
            ) : null}
            {item.teamName}
            <span className="mx-1.5">·</span>
            {formatRelativeDate(item.lastWorkedAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:pl-2">
        {item.canStartTimer && item.activityId ? (
          isTimerActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-sidebar-primary/15 px-3 py-1.5 text-xs font-medium text-sidebar-primary">
              <Play className="size-3.5 fill-current" />
              Em andamento
            </span>
          ) : (
            <StartActivityTimerButton
              teamId={item.teamId}
              activityId={item.activityId}
              size="icon-sm"
              className="size-9 text-muted-foreground hover:text-sidebar-primary"
            />
          )
        ) : null}
      </div>
    </li>
  )
}

export function RecentWorkItemsCard() {
  const [items, setItems] = useState<RecentWorkItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { activeTimer } = useActiveTimer()

  const loadItems = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<RecentWorkItemsResponse>('/time-entries/recent', {
        toastOnError: false,
      })
      setItems(data.items)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems, activeTimer?.timeEntry.id])

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Suas tarefas mais recentes</h2>
        <p className="text-sm text-muted-foreground">
          Atividades, projetos e tarefas em que você registrou tempo recentemente.
        </p>
      </div>

      {isLoading ? (
        <ul className="flex flex-col divide-y">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="py-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 py-8 text-center">
          <ClipboardList className="size-7 text-muted-foreground/70" />
          <p className="text-sm font-medium">Nenhum registro recente</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Quando você apontar tempo em uma atividade, ela aparecerá aqui.
          </p>
          <Link
            to="/equipes"
            className="mt-1 text-sm font-medium text-sidebar-primary hover:underline"
          >
            Ir para equipes
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((item) => (
            <RecentWorkItemRow key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

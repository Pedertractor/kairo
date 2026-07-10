import { Link } from 'react-router-dom';
import { ClipboardList, FolderKanban, ListTodo, Play } from 'lucide-react';

import { StartActivityTimerButton } from '@/components/start-activity-timer-button';
import { StartTaskTimerButton } from '@/components/start-task-timer-button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CARD_STATUS_BADGE_CLASS, STATUS_LABELS } from '@/lib/card-status';
import {
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_LABELS,
} from '@/lib/task-status';
import { cn } from '@/lib/utils';
import { useActiveTimer } from '@/hooks/use-active-timer';
import type { RecentWorkItem, RecentWorkItemKind } from '@/types/time-entry';

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
    icon: FolderKanban,
    className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  TASK: {
    label: 'Tarefa',
    icon: ListTodo,
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
};

function getStatusLabel(item: RecentWorkItem): string {
  if (item.kind === 'TASK') {
    return (
      TASK_STATUS_LABELS[item.status as keyof typeof TASK_STATUS_LABELS] ??
      item.status
    );
  }

  return (
    STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status
  );
}

function getItemHref(item: RecentWorkItem): string | null {
  if (item.kind === 'ACTIVITY' && item.activityId) {
    return `/equipes/${item.teamId}/atividades/${item.activityId}`;
  }

  if (item.kind === 'TASK' && item.projectId && item.taskId) {
    return `/projetos/${item.projectId}/tarefas/${item.taskId}`;
  }

  if (item.kind === 'PROJECT' && item.projectId) {
    return `/projetos/${item.projectId}`;
  }

  return `/equipes/${item.teamId}`;
}

function getStatusBadgeClass(
  item: RecentWorkItem,
  isTimerActive: boolean,
): string {
  if (isTimerActive) {
    return CARD_STATUS_BADGE_CLASS.IN_PROGRESS;
  }

  if (item.kind === 'TASK') {
    return (
      TASK_STATUS_BADGE_CLASS[
        item.status as keyof typeof TASK_STATUS_BADGE_CLASS
      ] ?? 'bg-muted text-muted-foreground'
    );
  }

  return (
    CARD_STATUS_BADGE_CLASS[
      item.status as keyof typeof CARD_STATUS_BADGE_CLASS
    ] ?? 'bg-muted text-muted-foreground'
  );
}

function RecentWorkItemCard({ item }: { item: RecentWorkItem }) {
  const { isActivityActive, isTaskActive } = useActiveTimer();
  const config = KIND_CONFIG[item.kind];
  const Icon = config.icon;
  const href = getItemHref(item);
  const isTimerActive =
    (item.activityId !== null && isActivityActive(item.activityId)) ||
    (item.taskId !== null && isTaskActive(item.taskId));
  const statusLabel = isTimerActive ? 'Em andamento' : getStatusLabel(item);

  return (
    <Card
      className={cn(
        'gap-0 rounded-xl border border-border/60 bg-card py-0 shadow-sm transition-all',
        isTimerActive &&
          'border-sidebar-primary bg-sidebar-primary/10 shadow-md shadow-sidebar-primary/15 ring-1 ring-sidebar-primary/35',
      )}
    >
      <CardContent className='flex items-center gap-2 px-2.5 py-2'>
        <div
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md',
            config.className,
          )}
        >
          <Icon className='size-3.5' />
        </div>

        <div className='min-w-0 flex-1'>
          <p className='truncate text-[10px] leading-tight text-muted-foreground'>
            {config.label}
          </p>
          {href ? (
            <Link
              to={href}
              className='block truncate text-xs font-medium hover:underline'
            >
              {item.title}
            </Link>
          ) : (
            <p className='truncate text-xs font-medium'>{item.title}</p>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-1'>
          {item.canStartTimer && item.activityId ? (
            <StartActivityTimerButton
              teamId={item.teamId}
              activityId={item.activityId}
              size='icon-sm'
              className='size-6 text-muted-foreground hover:text-sidebar-primary'
            />
          ) : item.canStartTimer && item.projectId && item.taskId ? (
            <StartTaskTimerButton
              projectId={item.projectId}
              taskId={item.taskId}
              size='icon-sm'
              className='size-6 text-muted-foreground hover:text-sidebar-primary'
            />
          ) : (
            <span className='flex size-6 items-center justify-center text-muted-foreground'>
              <Play className='size-3' />
            </span>
          )}

          <span
            className={cn(
              getStatusBadgeClass(item, isTimerActive),
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap',
            )}
          >
            {statusLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentWorkItemsCard({
  items,
  isLoading,
}: {
  items: RecentWorkItem[];
  isLoading: boolean;
}) {
  const displayItems = items
    .filter((item) => item.kind === 'ACTIVITY' || item.kind === 'TASK')
    .slice(0, 6);

  return (
    <section className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-4'>
        <h2 className='text-base font-semibold'>Suas atividades recentes</h2>
        <Link
          to='/equipes'
          className='text-sm font-medium text-sidebar-primary hover:underline'
        >
          Ver tudo
        </Link>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={index}
              className='gap-0 rounded-xl border border-border/60 bg-card py-0 shadow-sm'
            >
              <CardContent className='flex items-center gap-2 px-2.5 py-2'>
                <Skeleton className='size-7 rounded-md' />
                <div className='flex flex-1 flex-col gap-1'>
                  <Skeleton className='h-2.5 w-12' />
                  <Skeleton className='h-3.5 w-full' />
                </div>
                <Skeleton className='h-5 w-16 rounded-full' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <Card className='gap-0 rounded-xl border border-border/60 bg-card py-0 shadow-sm'>
          <CardContent className='flex min-h-20 flex-col items-center justify-center gap-1.5 py-5 text-center'>
            <ClipboardList className='size-5 text-muted-foreground/70' />
            <p className='text-sm font-medium'>Nenhuma atividade recente</p>
            <p className='max-w-sm text-xs text-muted-foreground'>
              Quando você apontar tempo em uma atividade ou tarefa, ela
              aparecerá aqui.
            </p>
            <Link
              to='/equipes'
              className='mt-0.5 text-sm font-medium text-sidebar-primary hover:underline'
            >
              Ir para equipes
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {displayItems.map((item) => (
            <RecentWorkItemCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

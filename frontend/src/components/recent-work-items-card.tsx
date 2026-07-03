import { Link } from 'react-router-dom';
import { ClipboardList, FolderKanban, ListTodo, Play } from 'lucide-react';

import { StartActivityTimerButton } from '@/components/start-activity-timer-button';
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
  const { isActivityActive } = useActiveTimer();
  const config = KIND_CONFIG[item.kind];
  const Icon = config.icon;
  const href = getItemHref(item);
  const isTimerActive =
    item.activityId !== null && isActivityActive(item.activityId);
  const statusLabel = isTimerActive ? 'Em andamento' : getStatusLabel(item);

  return (
    <Card
      className={cn(
        'gap-0 rounded-2xl border border-border/60 bg-card py-0 shadow-sm transition-all',
        isTimerActive &&
          'border-sidebar-primary bg-sidebar-primary/10 shadow-md shadow-sidebar-primary/15 ring-2 ring-sidebar-primary/35',
      )}
    >
      <CardContent className='flex items-center gap-3 py-3.5'>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            config.className,
          )}
        >
          <Icon className='size-4.5' />
        </div>

        <div className='min-w-0 flex-1'>
          {href ? (
            <Link
              to={href}
              className='block truncate text-sm font-medium hover:underline'
            >
              {item.title}
            </Link>
          ) : (
            <p className='truncate text-sm font-medium'>{item.title}</p>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          {item.canStartTimer && item.activityId ? (
            <StartActivityTimerButton
              teamId={item.teamId}
              activityId={item.activityId}
              size='icon-sm'
              className='size-8 text-muted-foreground hover:text-sidebar-primary'
            />
          ) : (
            <span className='flex size-8 items-center justify-center text-muted-foreground'>
              <Play className='size-4' />
            </span>
          )}

          <span
            className={cn(
              getStatusBadgeClass(item, isTimerActive),
              'rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap',
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
  const activityItems = items.filter((item) => item.kind === 'ACTIVITY');
  const displayItems = (activityItems.length > 0 ? activityItems : items).slice(
    0,
    3,
  );

  return (
    <section className='flex flex-col gap-4'>
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
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={index}
              className='gap-0 rounded-2xl border border-border/60 bg-card py-0 shadow-sm'
            >
              <CardContent className='flex items-center gap-3 py-3.5'>
                <Skeleton className='size-10 rounded-lg' />
                <Skeleton className='h-5 flex-1' />
                <Skeleton className='h-7 w-24 rounded-full' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <Card className='gap-0 rounded-2xl border border-border/60 bg-card py-0 shadow-sm'>
          <CardContent className='flex min-h-28 flex-col items-center justify-center gap-2 py-8 text-center'>
            <ClipboardList className='size-7 text-muted-foreground/70' />
            <p className='text-sm font-medium'>Nenhuma atividade recente</p>
            <p className='max-w-sm text-sm text-muted-foreground'>
              Quando você apontar tempo em uma atividade, ela aparecerá aqui.
            </p>
            <Link
              to='/equipes'
              className='mt-1 text-sm font-medium text-sidebar-primary hover:underline'
            >
              Ir para equipes
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-3'>
          {displayItems.map((item) => (
            <RecentWorkItemCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

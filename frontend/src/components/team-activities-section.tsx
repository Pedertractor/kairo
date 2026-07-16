import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CreateActivityDialog } from '@/components/create-activity-dialog';
import { FavoriteButton } from '@/components/favorite-button';
import { StartActivityTimerButton } from '@/components/start-activity-timer-button';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { api } from '@/lib/api-handler';
import { CardTimeBudget } from '@/components/card-time-budget';
import { cn } from '@/lib/utils';
import type { ActivitiesListResponse, ActivitySummary } from '@/types/card';

interface TeamActivitiesSectionProps {
  teamId: string;
}

export function TeamActivitiesSection({ teamId }: TeamActivitiesSectionProps) {
  const { isActivityCurrent } = useActiveTimer();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await api<ActivitiesListResponse>(
        `/teams/${teamId}/activities`,
      );
      setActivities(data.activities);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <p className='text-sm font-medium'>Atividades</p>
          <p className='text-sm text-muted-foreground'>
            Gerencie as atividades desta equipe.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Criar nova atividade
        </Button>
      </div>

      <CreateActivityDialog
        teamId={teamId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={loadActivities}
      />

      {isLoading ? (
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className='h-24 rounded-xl' />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className='flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center'>
          <p className='text-sm font-medium'>Nenhuma atividade ainda</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            As atividades desta equipe aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {activities.map((activity) => {
            const isTimerActive = isActivityCurrent(activity.id);

            return (
              <li
                key={activity.id}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-all',
                  isTimerActive &&
                    'border-sidebar-primary shadow-md shadow-sidebar-primary/15 ring-2 ring-sidebar-primary/35',
                )}
              >
                <div className='flex items-start justify-between gap-2'>
                  <Link
                    to={`/equipes/${teamId}/atividades/${activity.id}`}
                    className='text-sm font-medium hover:underline'
                  >
                    {activity.title}
                  </Link>
                  <div className='flex shrink-0 items-center gap-0.5'>
                    <FavoriteButton
                      target={{
                        kind: 'activity',
                        teamId,
                        activityId: activity.id,
                      }}
                      isFavorite={activity.isFavorite}
                      onToggle={(isFavorite) => {
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, isFavorite }
                              : item,
                          ),
                        );
                      }}
                    />
                    <StartActivityTimerButton
                      teamId={teamId}
                      activityId={activity.id}
                      className='text-muted-foreground hover:text-sidebar-primary'
                    />
                  </div>
                </div>
                {activity.description ? (
                  <p className='line-clamp-2 text-xs text-muted-foreground'>
                    {activity.description}
                  </p>
                ) : null}
                <CardTimeBudget
                  loggedSeconds={activity.loggedSeconds}
                  estimatedHours={activity.estimatedHours}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

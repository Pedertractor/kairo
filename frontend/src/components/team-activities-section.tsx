import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ActivityTagBadge } from '@/components/activity-tag-badge';
import { CreateActivityDialog } from '@/components/create-activity-dialog';
import { CreateTagDialog } from '@/components/create-tag-dialog';
import { DeleteActivityDialog } from '@/components/delete-activity-dialog';
import { EditActivityTagDialog } from '@/components/edit-activity-tag-dialog';
import { FavoriteButton } from '@/components/favorite-button';
import { FinishActivityDialog } from '@/components/finish-activity-dialog';
import { ItemActionsMenu } from '@/components/item-actions-menu';
import { StartActivityTimerButton } from '@/components/start-activity-timer-button';
import { UpdateActivityStatusDialog } from '@/components/update-activity-status-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { api } from '@/lib/api-handler';
import { CardTimeBudget } from '@/components/card-time-budget';
import {
  canFinishStatus,
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  isFinishedStatus,
  STATUS_LABELS,
} from '@/lib/card-status';
import { cn } from '@/lib/utils';
import type { ActivitiesListResponse, ActivitySummary } from '@/types/card';
import type { TagSummary, TagsListResponse } from '@/types/tag';

const ALL_TAGS = '__all__';
const VISIBILITY_ACTIVE = 'active';
const VISIBILITY_ALL = 'all';

interface TeamActivitiesSectionProps {
  teamId: string;
}

export function TeamActivitiesSection({ teamId }: TeamActivitiesSectionProps) {
  const { isActivityCurrent } = useActiveTimer();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [activityToFinish, setActivityToFinish] =
    useState<ActivitySummary | null>(null);
  const [activityToDelete, setActivityToDelete] =
    useState<ActivitySummary | null>(null);
  const [activityToUpdate, setActivityToUpdate] =
    useState<ActivitySummary | null>(null);
  const [activityToEditTag, setActivityToEditTag] =
    useState<ActivitySummary | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [tagFilter, setTagFilter] = useState(ALL_TAGS);
  const [visibilityFilter, setVisibilityFilter] = useState(VISIBILITY_ACTIVE);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);

    try {
      const [activitiesData, tagsData] = await Promise.all([
        api<ActivitiesListResponse>(`/teams/${teamId}/activities`),
        api<TagsListResponse>(`/teams/${teamId}/tags`),
      ]);
      setActivities(activitiesData.activities);
      setTags(tagsData.tags);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const filteredActivities = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    const showFinished = visibilityFilter === VISIBILITY_ALL;

    return activities.filter((activity) => {
      if (!showFinished && isFinishedStatus(activity.status)) {
        return false;
      }

      const matchesName =
        query === '' || activity.title.toLowerCase().includes(query);
      const matchesTag =
        tagFilter === ALL_TAGS || activity.tag?.id === tagFilter;

      return matchesName && matchesTag;
    });
  }, [activities, nameFilter, tagFilter, visibilityFilter]);

  const hasActiveFilter =
    nameFilter.trim() !== '' ||
    tagFilter !== ALL_TAGS ||
    visibilityFilter !== VISIBILITY_ACTIVE;
  const hasFinishedHidden =
    visibilityFilter === VISIBILITY_ACTIVE &&
    activities.some((activity) => isFinishedStatus(activity.status));

  function getTagFilterLabel(value: string) {
    if (value === ALL_TAGS) {
      return 'Todas as tags';
    }

    return tags.find((tag) => tag.id === value)?.name ?? 'Tag';
  }

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
        tags={tags}
      />

      <CreateTagDialog
        teamId={teamId}
        open={isCreateTagDialogOpen}
        onOpenChange={setIsCreateTagDialogOpen}
        onCreated={(tag) => {
          setTags((current) =>
            [...current, tag].sort((a, b) => a.name.localeCompare(b.name)),
          );
        }}
      />

      <FinishActivityDialog
        teamId={teamId}
        activity={activityToFinish}
        open={activityToFinish !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToFinish(null);
          }
        }}
        onFinished={loadActivities}
      />

      <DeleteActivityDialog
        teamId={teamId}
        activity={activityToDelete}
        open={activityToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToDelete(null);
          }
        }}
        onDeleted={loadActivities}
      />

      <UpdateActivityStatusDialog
        teamId={teamId}
        activity={activityToUpdate}
        open={activityToUpdate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToUpdate(null);
          }
        }}
        onUpdated={loadActivities}
      />

      <EditActivityTagDialog
        teamId={teamId}
        activity={activityToEditTag}
        open={activityToEditTag !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToEditTag(null);
          }
        }}
        onUpdated={loadActivities}
      />

      {!isLoading ? (
        <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center'>
          {activities.length > 0 ? (
            <>
              <div className='relative w-full sm:w-1/4'>
                <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  type='search'
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder='Buscar por nome...'
                  className='pl-8'
                  aria-label='Buscar atividades por nome'
                />
              </div>
              <div className='w-full sm:w-1/4'>
                <Select
                  value={tagFilter}
                  onValueChange={(value) => setTagFilter(value ?? ALL_TAGS)}
                >
                  <SelectTrigger className='w-full' aria-label='Filtrar por tag'>
                    <SelectValue placeholder='Filtrar por tag'>
                      {(selectedValue) => {
                        const value = String(selectedValue ?? ALL_TAGS);
                        if (value === ALL_TAGS) {
                          return 'Todas as tags';
                        }

                        const tag = tags.find((item) => item.id === value);
                        if (!tag) {
                          return getTagFilterLabel(value);
                        }

                        return (
                          <span className='flex items-center gap-2'>
                            <span
                              className='size-2.5 shrink-0 rounded-full'
                              style={{ backgroundColor: tag.color }}
                              aria-hidden
                            />
                            {tag.name}
                          </span>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TAGS}>Todas as tags</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <span className='flex items-center gap-2'>
                          <span
                            className='size-2.5 shrink-0 rounded-full'
                            style={{ backgroundColor: tag.color }}
                            aria-hidden
                          />
                          {tag.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-full sm:w-1/4'>
                <Select
                  value={visibilityFilter}
                  onValueChange={(value) =>
                    setVisibilityFilter(value ?? VISIBILITY_ACTIVE)
                  }
                >
                  <SelectTrigger
                    className='w-full'
                    aria-label='Filtrar concluídas'
                  >
                    <SelectValue>
                      {(selectedValue) =>
                        selectedValue === VISIBILITY_ALL ? 'Todos' : 'Ativos'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VISIBILITY_ACTIVE}>Ativos</SelectItem>
                    <SelectItem value={VISIBILITY_ALL}>Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsCreateTagDialogOpen(true)}
          >
            <Plus />
            Nova tag
          </Button>
        </div>
      ) : null}

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
      ) : filteredActivities.length === 0 ? (
        <div className='flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center'>
          <p className='text-sm font-medium'>Nenhuma atividade encontrada</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            {hasFinishedHidden && !hasActiveFilter
              ? 'Há atividades concluídas ocultas. Selecione "Todos" para exibi-las.'
              : hasActiveFilter
                ? 'Tente ajustar os filtros de busca.'
                : 'As atividades desta equipe aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <ul className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredActivities.map((activity) => {
            const isTimerActive = isActivityCurrent(activity.id);

            return (
              <li
                key={activity.id}
                className={cn(
                  'relative flex flex-col gap-2 rounded-lg border p-3 transition-all hover:bg-muted/50',
                  CARD_STATUS_CARD_CLASS[activity.status],
                  isTimerActive &&
                    'border-sidebar-primary shadow-md shadow-sidebar-primary/15 ring-2 ring-sidebar-primary/35',
                )}
              >
                <Link
                  to={`/equipes/${teamId}/atividades/${activity.id}`}
                  className='absolute inset-0 rounded-lg'
                  aria-label={activity.title}
                />
                <div className='pointer-events-none relative z-10 flex items-start justify-between gap-2'>
                  <p className='text-sm font-medium'>{activity.title}</p>
                  <div className='pointer-events-auto flex shrink-0 items-center gap-0.5'>
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
                    <ItemActionsMenu
                      title={activity.title}
                      canFinish={canFinishStatus(activity.status)}
                      onFinish={() => setActivityToFinish(activity)}
                      onDelete={() => setActivityToDelete(activity)}
                    />
                  </div>
                </div>
                <div className='pointer-events-none relative z-10 flex items-center gap-2 self-start'>
                  {activity.tag ? (
                    <ActivityTagBadge
                      tag={activity.tag}
                      className='pointer-events-auto max-w-28'
                      aria-label={`Alterar tag de ${activity.title}`}
                      onClick={() => setActivityToEditTag(activity)}
                    />
                  ) : null}
                  <button
                    type='button'
                    className={cn(
                      'pointer-events-auto',
                      CARD_STATUS_BADGE_CLASS[activity.status],
                    )}
                    aria-label={`Alterar status de ${activity.title}`}
                    onClick={() => setActivityToUpdate(activity)}
                  >
                    {STATUS_LABELS[activity.status]}
                  </button>
                </div>
                {activity.description ? (
                  <p className='pointer-events-none relative z-10 line-clamp-2 text-xs text-muted-foreground'>
                    {activity.description}
                  </p>
                ) : null}
                <div className='pointer-events-none relative z-10'>
                  <CardTimeBudget
                    loggedSeconds={activity.loggedSeconds}
                    estimatedHours={activity.estimatedHours}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

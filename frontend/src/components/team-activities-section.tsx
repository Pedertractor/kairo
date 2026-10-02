import { useAuth } from '@/hooks/use-auth'
import { canDeleteTeamCard } from '@/lib/team-permissions'
import { useCallback, useEffect, useState } from 'react';
import { Copy, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ActivityFilters } from '@/components/activity-filters';
import { useActivityFilters } from '@/hooks/use-activity-filters';
import { ActivityDetailsDialog } from '@/components/activity-details-dialog';
import { ActivityTagBadge } from '@/components/activity-tag-badge';
import { ComplexityLevelMeter, ComplexityLevelStripe } from '@/components/complexity-level-meter';
import { CreateActivityDialog } from '@/components/create-activity-dialog';
import { ManageTagsDialog } from '@/components/manage-tags-dialog';
import { DeleteActivityDialog } from '@/components/delete-activity-dialog';
import { EditActivityTagDialog } from '@/components/edit-activity-tag-dialog';
import { FavoriteButton } from '@/components/favorite-button';
import { FinishActivityDialog } from '@/components/finish-activity-dialog';
import { ItemActionsMenu } from '@/components/item-actions-menu';
import { StartActivityTimerButton } from '@/components/start-activity-timer-button';
import { UpdateActivityStatusDialog } from '@/components/update-activity-status-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTimer } from '@/hooks/use-active-timer';
import { subscribeActivityDataInvalidation } from '@/lib/activity-data-invalidation';
import { api } from '@/lib/api-handler';
import { CardTimeBudget } from '@/components/card-time-budget';
import { CardCreatedAt } from '@/components/card-created-at';
import {
  canFinishStatus,
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  STATUS_LABELS,
} from '@/lib/card-status';
import { cn } from '@/lib/utils';
import type { ActivitiesListResponse, ActivitySummary } from '@/types/card';
import type { TagSummary, TagsListResponse } from '@/types/tag';
import type { TeamMemberSummary, TeamSummary } from '@/types/team';

interface TeamActivitiesSectionProps {
  team: Pick<TeamSummary, 'role' | 'membersCanDeleteCards'>
  teamId: string;
  members: TeamMemberSummary[];
  canCreate: boolean;
  canEditActivities: boolean;
  canEditTags: boolean;
  canDeleteTags: boolean;
}

export function TeamActivitiesSection({
  team,
  teamId,
  members,
  canCreate,
  canEditActivities,
  canEditTags,
  canDeleteTags,
}: TeamActivitiesSectionProps) {
  const { user } = useAuth()
  const { isActivityCurrent } = useActiveTimer();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activityToCopy, setActivityToCopy] =
    useState<ActivitySummary | null>(null);
  const [isManageTagsDialogOpen, setIsManageTagsDialogOpen] = useState(false);
  const [activityToFinish, setActivityToFinish] =
    useState<ActivitySummary | null>(null);
  const [activityToDelete, setActivityToDelete] =
    useState<ActivitySummary | null>(null);
  const [activityToUpdate, setActivityToUpdate] =
    useState<ActivitySummary | null>(null);
  const [activityToEditTag, setActivityToEditTag] =
    useState<ActivitySummary | null>(null);
  const [activityToDetail, setActivityToDetail] =
    useState<ActivitySummary | null>(null);
  const activityFilters = useActivityFilters(activities, { tags, members, scopeTeamId: teamId });
  const { filteredActivities, hasActiveFilters, hasFinishedHidden } = activityFilters;

  const loadActivities = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }

      try {
        const [activitiesData, tagsData] = await Promise.all([
          api<ActivitiesListResponse>(`/teams/${teamId}/activities`),
          api<TagsListResponse>(`/teams/${teamId}/tags`),
        ]);
        setActivities(activitiesData.activities);
        setTags(tagsData.tags);
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [teamId],
  );

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(
    () =>
      subscribeActivityDataInvalidation(() =>
        void loadActivities({ silent: true }),
      ),
    [loadActivities],
  );

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <p className='text-sm font-medium'>Atividades</p>
          <p className='text-sm text-muted-foreground'>
            Gerencie as atividades desta equipe.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Criar nova atividade
          </Button>
        ) : null}
      </div>

      <CreateActivityDialog
        teamId={teamId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={loadActivities}
        tags={tags}
      />

      <CreateActivityDialog
        sourceActivity={activityToCopy ?? undefined}
        open={activityToCopy !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToCopy(null);
          }
        }}
        onCreated={() => {}}
      />

      <ManageTagsDialog
        teamId={teamId}
        tags={tags}
        canEdit={canEditTags}
        canDelete={canDeleteTags}
        open={isManageTagsDialogOpen}
        onOpenChange={setIsManageTagsDialogOpen}
        onCreated={(tag) => {
          setTags((current) =>
            [...current, tag].sort((a, b) => a.name.localeCompare(b.name)),
          );
        }}
        onUpdated={(tag) => {
          setTags((current) =>
            current
              .map((item) => (item.id === tag.id ? tag : item))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
          setActivities((current) =>
            current.map((activity) =>
              activity.tag?.id === tag.id
                ? {
                    ...activity,
                    tag: {
                      id: tag.id,
                      name: tag.name,
                      color: tag.color,
                    },
                  }
                : activity,
            ),
          );
        }}
        onDeleted={(tagId) => {
          setTags((current) => current.filter((tag) => tag.id !== tagId));
          setActivities((current) =>
            current.map((activity) =>
              activity.tag?.id === tagId
                ? { ...activity, tag: null }
                : activity,
            ),
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

      <ActivityDetailsDialog
        teamId={teamId}
        activity={activityToDetail}
        open={activityToDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityToDetail(null);
          }
        }}
        onUpdated={loadActivities}
      />

      {!isLoading ? (
        <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-end'>
          {activities.length > 0 ? (
            <ActivityFilters
              controller={activityFilters}
              description="Filtrar as atividades desta equipe."
            />
          ) : null}
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsManageTagsDialogOpen(true)}
          >
            <Tags />
            Etiquetas
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
            {hasFinishedHidden && !hasActiveFilters
              ? 'Há atividades concluídas ocultas. Selecione "Todas" para exibi-las.'
              : hasActiveFilters
                ? 'Tente ajustar ou limpar os filtros.'
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
                  activity.complexityLevel && 'pl-4',
                  CARD_STATUS_CARD_CLASS[activity.status],
                  isTimerActive &&
                    'border-sidebar-primary shadow-md shadow-sidebar-primary/15 ring-2 ring-sidebar-primary/35',
                )}
              >
                {activity.complexityLevel ? (
                  <ComplexityLevelStripe level={activity.complexityLevel} />
                ) : null}
                <Link
                  to={`/equipes/${teamId}/atividades/${activity.id}`}
                  className='absolute inset-0 rounded-lg'
                  aria-label={activity.title}
                />
                <div className='pointer-events-none relative z-10 flex items-start justify-between gap-2'>
                  <p className='text-sm font-medium'>{activity.title}</p>
                  <div className='pointer-events-auto flex shrink-0 items-center gap-0.5'>
                    {canCreate ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-xs'
                        className='text-muted-foreground hover:text-sidebar-primary'
                        aria-label={`Copiar atividade ${activity.title}`}
                        title='Copiar atividade'
                        onClick={(event) => {
                          event.stopPropagation();
                          setActivityToCopy(activity);
                        }}
                      >
                        <Copy />
                      </Button>
                    ) : null}
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
                      onDetails={() => setActivityToDetail(activity)}
                      onFinish={() => setActivityToFinish(activity)}
                      canDelete={canDeleteTeamCard(team, activity.createdById, user?.id)}
                      onDelete={() => setActivityToDelete(activity)}
                    />
                  </div>
                </div>
                <div className='pointer-events-none relative z-10 flex items-center gap-2 self-start'>
                  {activity.tag ? (
                    <ActivityTagBadge
                      tag={activity.tag}
                      className='pointer-events-auto max-w-28'
                      aria-label={`Alterar etiqueta de ${activity.title}`}
                      onClick={
                        canEditActivities
                          ? () => setActivityToEditTag(activity)
                          : undefined
                      }
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
                  <p className='pointer-events-none relative z-10 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground'>
                    {activity.description}
                  </p>
                ) : null}
                {activity.assignedToName ? (
                  <p className='pointer-events-none relative z-10 truncate text-xs text-muted-foreground'>
                    Responsável:{' '}
                    <span className='font-medium text-foreground'>
                      {activity.assignedToName}
                    </span>
                  </p>
                ) : null}
                {activity.complexityLevel ? (
                  <ComplexityLevelMeter
                    level={activity.complexityLevel}
                    size="md"
                    className="pointer-events-none relative z-10 text-xs text-muted-foreground"
                  />
                ) : null}
                <div className='pointer-events-none relative z-10 flex items-center justify-between gap-2 [&>div]:min-w-0 [&>div]:flex-1'>
                  <CardTimeBudget
                    loggedSeconds={activity.loggedSeconds}
                    estimatedHours={activity.estimatedHours}
                    className="truncate"
                  />
                  <CardCreatedAt createdAt={activity.createdAt} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

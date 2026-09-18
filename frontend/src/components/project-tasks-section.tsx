import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { CreateTaskDialog } from '@/components/create-task-dialog';
import { ActivityTagBadge } from '@/components/activity-tag-badge';
import { ComplexityLevelMeter, ComplexityLevelStripe } from '@/components/complexity-level-meter';
import { FilterField, ResponsiveFilters } from '@/components/responsive-filters';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { EditTaskTagDialog } from '@/components/edit-task-tag-dialog';
import { TaskDetailsDialog } from '@/components/task-details-dialog';
import { FavoriteButton } from '@/components/favorite-button';
import { FinishTaskDialog } from '@/components/finish-task-dialog';
import { ItemActionsMenu } from '@/components/item-actions-menu';
import { StartTaskTimerButton } from '@/components/start-task-timer-button';
import { UpdateTaskStatusDialog } from '@/components/update-task-status-dialog';
import { Button } from '@/components/ui/button';
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
import { subscribeTaskDataInvalidation } from '@/lib/task-data-invalidation';
import {
  canFinishTaskStatus,
  isFinishedTaskStatus,
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_BADGE_HOVER_CLASS,
  TASK_STATUS_LABELS,
} from '@/lib/task-status';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskSummary, TasksListResponse } from '@/types/task';
import type { TagSummary, TagsListResponse } from '@/types/tag';
import type { TeamMemberSummary, TeamResponse } from '@/types/team';

interface ProjectTasksSectionProps {
  projectId: string;
  teamId: string;
}

const VISIBILITY_ACTIVE = 'active';
const VISIBILITY_ALL = 'all';
const ALL_ASSIGNEES = 'all';
const UNASSIGNED = 'unassigned';
const ALL_TAGS = 'all';

const TASK_CARD_STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: 'border-border bg-card',
  IN_PROGRESS:
    'border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20',
  PAUSED:
    'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
  DONE: 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/60 dark:bg-emerald-950/25',
  CANCELED:
    'border-rose-200 bg-rose-50/65 dark:border-rose-900/60 dark:bg-rose-950/20',
};

export function ProjectTasksSection({
  projectId,
  teamId,
}: ProjectTasksSectionProps) {
  const { isTaskCurrent } = useActiveTimer();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [taskToFinish, setTaskToFinish] = useState<TaskSummary | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskSummary | null>(null);
  const [taskToUpdate, setTaskToUpdate] = useState<TaskSummary | null>(null);
  const [taskToEditTag, setTaskToEditTag] = useState<TaskSummary | null>(null);
  const [taskToDetail, setTaskToDetail] = useState<TaskSummary | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState(VISIBILITY_ACTIVE);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_ASSIGNEES);
  const [tagFilter, setTagFilter] = useState(ALL_TAGS);
  const [members, setMembers] = useState<TeamMemberSummary[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [members],
  );
  const selectedAssignee = sortedMembers.find(
    (member) => member.id === assigneeFilter,
  );
  const selectedTag = tags.find((tag) => tag.id === tagFilter);

  function getTagFilterLabel(value: string) {
    if (value === ALL_TAGS) {
      return 'Todas as etiquetas';
    }

    return selectedTag?.name ?? 'Etiqueta';
  }

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const data = await api<TasksListResponse>(`/projects/${projectId}/tasks`);
      setTasks(data.tasks);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      const data = await api<TeamResponse>(`/teams/${teamId}`);
      if (!cancelled) {
        setMembers(data.team.members);
      }
    }

    async function loadTags() {
      try {
        const data = await api<TagsListResponse>(`/teams/${teamId}/tags`, {
          toastOnError: false,
        });
        if (!cancelled) {
          setTags(data.tags);
        }
      } catch {
        if (!cancelled) {
          setTags([]);
        }
      }
    }

    void loadMembers();
    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    if (
      assigneeFilter !== ALL_ASSIGNEES &&
      assigneeFilter !== UNASSIGNED &&
      members.length > 0 &&
      !members.some((member) => member.id === assigneeFilter)
    ) {
      setAssigneeFilter(ALL_ASSIGNEES);
    }
  }, [members, assigneeFilter]);

  useEffect(() => {
    if (
      tagFilter !== ALL_TAGS &&
      tags.length > 0 &&
      !tags.some((tag) => tag.id === tagFilter)
    ) {
      setTagFilter(ALL_TAGS);
    }
  }, [tags, tagFilter]);

  useEffect(
    () => subscribeTaskDataInvalidation(() => void loadTasks({ silent: true })),
    [loadTasks],
  );

  const filteredTasks = useMemo(() => {
    const showFinished = visibilityFilter === VISIBILITY_ALL;

    return tasks.filter((task) => {
      if (!showFinished && isFinishedTaskStatus(task.status)) {
        return false;
      }

      const matchesAssignee =
        assigneeFilter === ALL_ASSIGNEES ||
        (assigneeFilter === UNASSIGNED
          ? !task.assignedToId
          : task.assignedToId === assigneeFilter);

      const matchesTag =
        tagFilter === ALL_TAGS || task.tag?.id === tagFilter;

      return matchesAssignee && matchesTag;
    });
  }, [tasks, visibilityFilter, assigneeFilter, tagFilter]);

  const hasSheetFilters =
    visibilityFilter !== VISIBILITY_ACTIVE ||
    assigneeFilter !== ALL_ASSIGNEES ||
    tagFilter !== ALL_TAGS;
  const hasFinishedHidden =
    visibilityFilter === VISIBILITY_ACTIVE &&
    tasks.some((task) => isFinishedTaskStatus(task.status));

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <p className='text-sm font-medium'>Tarefas</p>
          <p className='text-sm text-muted-foreground'>
            Gerencie as tarefas deste projeto.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Criar nova tarefa
        </Button>
      </div>

      <CreateTaskDialog
        projectId={projectId}
        teamId={teamId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={loadTasks}
      />

      <FinishTaskDialog
        projectId={projectId}
        task={taskToFinish}
        open={taskToFinish !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToFinish(null);
          }
        }}
        onFinished={() => void loadTasks()}
      />

      <DeleteTaskDialog
        projectId={projectId}
        task={taskToDelete}
        open={taskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToDelete(null);
          }
        }}
        onDeleted={() => void loadTasks()}
      />

      <UpdateTaskStatusDialog
        projectId={projectId}
        task={taskToUpdate}
        open={taskToUpdate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToUpdate(null);
          }
        }}
        onUpdated={() => void loadTasks()}
      />

      <EditTaskTagDialog
        projectId={projectId}
        teamId={teamId}
        task={taskToEditTag}
        open={taskToEditTag !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToEditTag(null);
          }
        }}
        onUpdated={() => void loadTasks()}
      />

      <TaskDetailsDialog
        projectId={projectId}
        teamId={teamId}
        task={taskToDetail}
        open={taskToDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToDetail(null);
          }
        }}
        onUpdated={() => void loadTasks()}
      />

      {!isLoading && tasks.length > 0 ? (
        <div className='flex items-end'>
          <ResponsiveFilters
            description='Filtrar as tarefas deste projeto.'
            hasActiveFilters={hasSheetFilters}
          >
            {(idPrefix, itemClassName) => (
              <>
                <FilterField
                  id={`${idPrefix}-tag`}
                  label='Filtrar por etiqueta'
                  className={itemClassName}
                >
                  <Select
                    value={tagFilter}
                    onValueChange={(value) =>
                      setTagFilter(value ?? ALL_TAGS)
                    }
                  >
                    <SelectTrigger
                      id={`${idPrefix}-tag`}
                      className='w-full'
                      aria-label='Filtrar por etiqueta'
                    >
                      <SelectValue placeholder='Filtrar por etiqueta'>
                        {(selectedValue) => {
                          const value = String(selectedValue ?? ALL_TAGS);
                          if (value === ALL_TAGS) {
                            return 'Todas as etiquetas';
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
                      <SelectItem value={ALL_TAGS}>
                        Todas as etiquetas
                      </SelectItem>
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
                </FilterField>

                <FilterField
                  id={`${idPrefix}-assignee`}
                  label='Filtrar por responsável'
                  className={itemClassName}
                >
                  <Select
                    value={assigneeFilter}
                    onValueChange={(value) =>
                      setAssigneeFilter(value ?? ALL_ASSIGNEES)
                    }
                  >
                    <SelectTrigger
                      id={`${idPrefix}-assignee`}
                      className='w-full'
                      aria-label='Filtrar por responsável'
                    >
                      <SelectValue placeholder='Todos os responsáveis'>
                        {() => {
                          if (assigneeFilter === UNASSIGNED) {
                            return 'Sem responsável';
                          }

                          return (
                            selectedAssignee?.name ?? 'Todos os responsáveis'
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ASSIGNEES}>
                        Todos os responsáveis
                      </SelectItem>
                      <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>
                      {sortedMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField
                  id={`${idPrefix}-visibility`}
                  label='Filtrar por situação'
                  className={itemClassName}
                >
                  <Select
                    value={visibilityFilter}
                    onValueChange={(value) =>
                      setVisibilityFilter(value ?? VISIBILITY_ACTIVE)
                    }
                  >
                    <SelectTrigger
                      id={`${idPrefix}-visibility`}
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
                </FilterField>
              </>
            )}
          </ResponsiveFilters>
        </div>
      ) : null}

      {isLoading ? (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className='h-28 rounded-lg' />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className='flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center'>
          <p className='text-sm font-medium'>Nenhuma tarefa ainda</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            As tarefas deste projeto aparecerão aqui.
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className='flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center'>
          <p className='text-sm font-medium'>Nenhuma tarefa encontrada</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            {hasFinishedHidden && !hasSheetFilters
              ? 'Há tarefas concluídas ocultas. Selecione "Todos" para exibi-las.'
              : hasSheetFilters
                ? 'Tente ajustar os filtros de busca.'
                : 'As tarefas deste projeto aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredTasks.map((task) => {
            const isTimerActive = isTaskCurrent(task.id);

            return (
              <li
                key={task.id}
                className={cn(
                  'group relative min-h-28 rounded-lg border transition-all',
                  'after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:bg-muted/30 after:opacity-0 after:transition-opacity hover:after:opacity-100',
                  TASK_CARD_STATUS_CLASS[task.status],
                  isTimerActive &&
                    'border-sidebar-primary shadow-md shadow-sidebar-primary/15 ring-2 ring-sidebar-primary/35',
                )}
              >
                {task.complexityLevel ? (
                  <ComplexityLevelStripe level={task.complexityLevel} />
                ) : null}
                <div
                  className={cn(
                    'relative z-[2] flex h-full items-start gap-2 p-3',
                    task.complexityLevel && 'pl-4',
                  )}
                >
                  <Link
                    to={`/projetos/${projectId}/tarefas/${task.id}`}
                    className='flex min-w-0 flex-1 flex-col gap-1.5'
                  >
                    <p
                      className='line-clamp-2 break-words text-sm font-medium leading-snug'
                      title={task.title}
                    >
                      {task.title}
                    </p>
                    {task.description ? (
                      <p
                        className='line-clamp-2 break-words text-[11px] text-muted-foreground'
                        title={task.description}
                      >
                        {task.description}
                      </p>
                    ) : null}
                    <div className='mt-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground'>
                      {task.complexityLevel ? (
                        <ComplexityLevelMeter
                          level={task.complexityLevel}
                          className="text-[11px] text-muted-foreground"
                        />
                      ) : null}
                      {task.estimatedHours ? (
                        <span>{task.estimatedHours}h</span>
                      ) : null}
                      {task.assignedToName ? (
                        <span className='truncate'>{task.assignedToName}</span>
                      ) : null}
                    </div>
                  </Link>
                  <div
                    className='flex shrink-0 items-start gap-1'
                    onClick={(event) => event.preventDefault()}
                  >
                    <div className='flex items-center gap-0.5'>
                      <FavoriteButton
                        target={{
                          kind: 'task',
                          projectId,
                          taskId: task.id,
                        }}
                        isFavorite={task.isFavorite}
                        onToggle={(isFavorite) => {
                          setTasks((current) =>
                            current.map((item) =>
                              item.id === task.id
                                ? { ...item, isFavorite }
                                : item,
                            ),
                          );
                        }}
                      />
                      <StartTaskTimerButton
                        projectId={projectId}
                        taskId={task.id}
                        className='text-muted-foreground hover:text-sidebar-primary'
                      />
                      <ItemActionsMenu
                        title={task.title}
                        canFinish={canFinishTaskStatus(task.status)}
                        onDetails={() => setTaskToDetail(task)}
                        onFinish={() => setTaskToFinish(task)}
                        onDelete={() => setTaskToDelete(task)}
                      />
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <button
                        type='button'
                        className={cn(
                          TASK_STATUS_BADGE_CLASS[task.status],
                          TASK_STATUS_BADGE_HOVER_CLASS[task.status],
                        )}
                        aria-label={`Alterar status de ${task.title}`}
                        onClick={() => setTaskToUpdate(task)}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </button>
                      {task.tag ? (
                        <ActivityTagBadge
                          tag={task.tag}
                          className='max-w-28'
                          aria-label={`Alterar etiqueta de ${task.title}`}
                          onClick={() => setTaskToEditTag(task)}
                        />
                      ) : (
                        <button
                          type='button'
                          className='inline-flex max-w-28 items-center truncate rounded-md border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground'
                          aria-label={`Adicionar etiqueta em ${task.title}`}
                          onClick={() => setTaskToEditTag(task)}
                        >
                          Etiqueta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

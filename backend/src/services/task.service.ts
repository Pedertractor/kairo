import type { Task, TaskStatus } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import type { TaskDetail, TaskSummary } from '../types/task.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

type TaskWithAssignee = Task & {
  assignedTo: { id: string; name: string } | null;
};

function toTaskSummary(
  task: TaskWithAssignee,
  isFavorite = false,
): TaskSummary {
  return {
    id: task.id,
    cardId: task.cardId,
    title: task.title,
    description: task.description,
    status: task.status,
    estimatedHours: task.estimatedHours?.toString() ?? null,
    assignedToId: task.assignedToId,
    assignedToName: task.assignedTo?.name ?? null,
    sortOrder: task.sortOrder,
    isFavorite,
    createdById: task.createdById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly cardRepository: CardRepository,
    private readonly teamRepository: TeamRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly favoriteRepository: FavoriteRepository,
  ) {}

  private async assertProjectAccess(projectId: string, userId: string) {
    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      card.teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    return card;
  }

  private async getFavoriteTaskIdSet(userId: string, taskIds: string[]) {
    const favorites = await this.favoriteRepository.findFavoriteTaskIds(
      userId,
      taskIds,
    );

    return new Set(
      favorites
        .map((favorite) => favorite.taskId)
        .filter((taskId): taskId is string => taskId !== null),
    );
  }

  async listTasks(projectId: string, userId: string): Promise<TaskSummary[]> {
    await this.assertProjectAccess(projectId, userId);

    const tasks = await this.taskRepository.findByProjectId(projectId);
    const favoriteIds = await this.getFavoriteTaskIdSet(
      userId,
      tasks.map((task) => task.id),
    );

    return tasks.map((task) =>
      toTaskSummary(task, favoriteIds.has(task.id)),
    );
  }

  async createTask(
    projectId: string,
    userId: string,
    title: string,
    description?: string,
    estimatedHours?: number,
  ): Promise<TaskSummary> {
    await this.assertProjectAccess(projectId, userId);

    const maxSortOrder =
      (await this.taskRepository.getMaxSortOrder(projectId))._max.sortOrder ??
      -1;

    const task = await this.taskRepository.create({
      cardId: projectId,
      createdById: userId,
      title,
      description,
      estimatedHours,
      sortOrder: maxSortOrder + 1,
    });

    return toTaskSummary(task);
  }

  async getTask(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDetail> {
    await this.assertProjectAccess(projectId, userId);

    const task = await this.taskRepository.findById(taskId);

    if (!task || task.cardId !== projectId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const [loggedSeconds, favorite] = await Promise.all([
      this.timeEntryRepository.getLoggedSecondsByTaskId(taskId),
      this.favoriteRepository.findTaskFavorite(userId, taskId),
    ]);

    return {
      ...toTaskSummary(task, favorite !== null),
      loggedSeconds,
    };
  }

  async updateTask(
    projectId: string,
    taskId: string,
    userId: string,
    data: { title?: string; status?: TaskStatus },
  ): Promise<TaskDetail> {
    await this.assertProjectAccess(projectId, userId);

    const task = await this.taskRepository.findById(taskId);

    if (!task || task.cardId !== projectId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (data.status === 'DONE' && task.status !== 'DONE') {
      const activeEntries =
        await this.timeEntryRepository.findActiveManyByTaskId(taskId);
      const endedAt = new Date();

      for (const entry of activeEntries) {
        await this.timeEntryRepository.stopEntry(entry, endedAt);
      }
    }

    const updateData: {
      title?: string;
      status?: TaskStatus;
      completedAt?: Date | null;
    } = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;

      if (data.status === 'DONE') {
        updateData.completedAt = task.completedAt ?? new Date();
      } else if (task.status === 'DONE') {
        updateData.completedAt = null;
      }
    }

    const updated = await this.taskRepository.update(taskId, updateData);

    const [loggedSeconds, favorite] = await Promise.all([
      this.timeEntryRepository.getLoggedSecondsByTaskId(taskId),
      this.favoriteRepository.findTaskFavorite(userId, taskId),
    ]);

    return {
      ...toTaskSummary(updated, favorite !== null),
      loggedSeconds,
    };
  }
}

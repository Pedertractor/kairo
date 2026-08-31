import type { ComplexityLevel, Task, TaskStatus } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { MachineRepository } from '../repositories/machine.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import type {
  TaskDetail,
  TaskMachineSummary,
  TaskSummary,
} from '../types/task.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { assertTeamMembership } from '../utils/team-access.js';

type TaskWithRelations = Task & {
  assignedTo: { id: string; name: string } | null;
  machine?: TaskMachineSummary | null;
};

function toTaskMachine(
  machine: TaskMachineSummary | null | undefined,
): TaskMachineSummary | null {
  if (!machine) {
    return null;
  }

  return {
    id: machine.id,
    name: machine.name,
    costCenter: machine.costCenter,
  };
}

function toTaskSummary(
  task: TaskWithRelations,
  isFavorite = false,
): TaskSummary {
  return {
    id: task.id,
    cardId: task.cardId,
    title: task.title,
    description: task.description,
    status: task.status,
    complexityLevel: task.complexityLevel,
    estimatedHours: task.estimatedHours?.toString() ?? null,
    assignedToId: task.assignedToId,
    assignedToName: task.assignedTo?.name ?? null,
    machine: toTaskMachine(task.machine),
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
    private readonly machineRepository: MachineRepository,
  ) {}

  private async assertMachine(machineId: string) {
    const machine = await this.machineRepository.findById(machineId);

    if (!machine) {
      throw new AppError(404, MENSAGENS.MAQUINA_NAO_ENCONTRADA);
    }
  }

  private async assertProjectAccess(projectId: string, userId: string) {
    const card = await this.cardRepository.findProjectById(projectId);

    if (!card || card.type !== 'PROJECT') {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      card.teamId,
      userId,
    );
    assertTeamMembership(membership);

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
    machineId?: string,
    complexityLevel?: ComplexityLevel,
  ): Promise<TaskSummary> {
    await this.assertProjectAccess(projectId, userId);

    if (machineId) {
      await this.assertMachine(machineId);
    }

    const maxSortOrder =
      (await this.taskRepository.getMaxSortOrder(projectId))._max.sortOrder ??
      -1;

    const task = await this.taskRepository.create({
      cardId: projectId,
      createdById: userId,
      title,
      description,
      estimatedHours,
      machineId,
      complexityLevel,
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
    data: {
      title?: string;
      status?: TaskStatus;
      machineId?: string | null;
      complexityLevel?: ComplexityLevel | null;
      estimatedHours?: number | null;
    },
  ): Promise<TaskDetail> {
    await this.assertProjectAccess(projectId, userId);

    const task = await this.taskRepository.findById(taskId);

    if (!task || task.cardId !== projectId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (data.machineId) {
      await this.assertMachine(data.machineId);
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
      machineId?: string | null;
      complexityLevel?: ComplexityLevel | null;
      estimatedHours?: number | null;
    } = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.machineId !== undefined) {
      updateData.machineId = data.machineId;
    }

    if (data.complexityLevel !== undefined) {
      updateData.complexityLevel = data.complexityLevel;
    }

    if (data.estimatedHours !== undefined) {
      updateData.estimatedHours = data.estimatedHours;
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

  async deleteTask(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskSummary> {
    await this.assertProjectAccess(projectId, userId);

    const task = await this.taskRepository.findById(taskId);

    if (!task || task.cardId !== projectId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const activeEntries =
      await this.timeEntryRepository.findActiveManyByTaskId(taskId);
    const endedAt = new Date();

    for (const entry of activeEntries) {
      await this.timeEntryRepository.stopEntry(entry, endedAt);
    }

    const deleted = await this.taskRepository.softDelete(taskId);

    return toTaskSummary(deleted);
  }
}

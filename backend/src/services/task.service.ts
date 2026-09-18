import type { ComplexityLevel, Task, TaskStatus } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { MachineRepository } from '../repositories/machine.repository.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import type {
  TaskDetail,
  TaskMachineSummary,
  TaskSummary,
  TaskTagSummary,
} from '../types/task.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { assertTeamMembership } from '../utils/team-access.js';

type TaskWithRelations = Task & {
  assignedTo: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
  tag?: TaskTagSummary | null;
  machine?: TaskMachineSummary | null;
  card?: { teamId: string } | null;
};

function toTaskTag(
  tag: TaskTagSummary | null | undefined,
): TaskTagSummary | null {
  if (!tag) {
    return null;
  }

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  };
}

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
    teamId: task.card?.teamId ?? '',
    title: task.title,
    description: task.description,
    status: task.status,
    complexityLevel: task.complexityLevel,
    estimatedHours: task.estimatedHours?.toString() ?? null,
    assignedToId: task.assignedToId,
    assignedToName: task.assignedTo?.name ?? null,
    tag: toTaskTag(task.tag),
    machine: toTaskMachine(task.machine),
    sortOrder: task.sortOrder,
    isFavorite,
    createdById: task.createdById,
    createdByName: task.createdBy?.name ?? null,
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
    private readonly tagRepository: TagRepository,
  ) {}

  private async assertTeamTag(teamId: string, tagId: string) {
    const tag = await this.tagRepository.findById(tagId);

    if (!tag || tag.teamId !== teamId) {
      throw new AppError(404, MENSAGENS.TAG_NAO_ENCONTRADA);
    }
  }

  private async assertMachine(machineId: string) {
    const machine = await this.machineRepository.findById(machineId);

    if (!machine) {
      throw new AppError(404, MENSAGENS.MAQUINA_NAO_ENCONTRADA);
    }
  }

  private async assertAssigneeIsTeamMember(
    teamId: string,
    assignedToId: string,
  ) {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      assignedToId,
    );

    if (!membership) {
      throw new AppError(400, MENSAGENS.RESPONSAVEL_NAO_E_MEMBRO);
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
    tagId?: string,
  ): Promise<TaskSummary> {
    const project = await this.assertProjectAccess(projectId, userId);

    if (machineId) {
      await this.assertMachine(machineId);
    }

    if (tagId) {
      await this.assertTeamTag(project.teamId, tagId);
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
      tagId,
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
      description?: string | null;
      machineId?: string | null;
      assignedToId?: string | null;
      tagId?: string | null;
      complexityLevel?: ComplexityLevel | null;
      estimatedHours?: number | null;
    },
  ): Promise<TaskDetail> {
    const project = await this.assertProjectAccess(projectId, userId);

    const task = await this.taskRepository.findById(taskId);

    if (!task || task.cardId !== projectId) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (data.machineId) {
      await this.assertMachine(data.machineId);
    }

    if (data.assignedToId) {
      await this.assertAssigneeIsTeamMember(project.teamId, data.assignedToId);
    }

    if (data.tagId) {
      await this.assertTeamTag(project.teamId, data.tagId);
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
      description?: string | null;
      machineId?: string | null;
      assignedToId?: string | null;
      tagId?: string | null;
      complexityLevel?: ComplexityLevel | null;
      estimatedHours?: number | null;
    } = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.machineId !== undefined) {
      updateData.machineId = data.machineId;
    }

    if (data.assignedToId !== undefined) {
      updateData.assignedToId = data.assignedToId;
    }

    if (data.tagId !== undefined) {
      updateData.tagId = data.tagId;
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

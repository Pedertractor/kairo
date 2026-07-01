import type { Task } from '../generated/client.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import type { TaskSummary } from '../types/task.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

type TaskWithAssignee = Task & {
  assignedTo: { id: string; name: string } | null;
};

function toTaskSummary(task: TaskWithAssignee): TaskSummary {
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

  async listTasks(
    projectId: string,
    userId: string,
  ): Promise<TaskSummary[]> {
    await this.assertProjectAccess(projectId, userId);

    const tasks = await this.taskRepository.findByProjectId(projectId);

    return tasks.map(toTaskSummary);
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
}

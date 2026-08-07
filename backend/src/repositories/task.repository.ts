import type { PrismaClient, TaskStatus } from '../generated/client.js';

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(taskId: string) {
    return this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, name: true } },
        card: {
          select: {
            id: true,
            title: true,
            type: true,
            teamId: true,
          },
        },
      },
    });
  }

  updateStatus(taskId: string, status: TaskStatus) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status },
    });
  }

  update(
    taskId: string,
    data: {
      title?: string;
      status?: TaskStatus;
      completedAt?: Date | null;
    },
  ) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.completedAt !== undefined
          ? { completedAt: data.completedAt }
          : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  /** Updates status unless the task is already DONE or CANCELED. */
  updateStatusIfOpen(taskId: string, status: TaskStatus) {
    return this.prisma.task.updateMany({
      where: {
        id: taskId,
        deletedAt: null,
        status: { notIn: ['DONE', 'CANCELED'] },
      },
      data: { status },
    });
  }

  findByProjectId(projectId: string) {
    return this.prisma.task.findMany({
      where: { cardId: projectId, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  getMaxSortOrder(projectId: string) {
    return this.prisma.task.aggregate({
      where: { cardId: projectId, deletedAt: null },
      _max: { sortOrder: true },
    });
  }

  create(data: {
    cardId: string;
    createdById: string;
    title: string;
    description?: string;
    estimatedHours?: number;
    sortOrder: number;
  }) {
    return this.prisma.task.create({
      data: {
        cardId: data.cardId,
        createdById: data.createdById,
        title: data.title,
        description: data.description ?? null,
        estimatedHours: data.estimatedHours ?? null,
        sortOrder: data.sortOrder,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  softDelete(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  softDeleteByProjectId(projectId: string) {
    return this.prisma.task.updateMany({
      where: { cardId: projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}

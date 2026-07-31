import type { PrismaClient, TaskStatus } from '../generated/client.js';

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
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

  update(taskId: string, data: { title: string }) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { title: data.title },
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
        status: { notIn: ['DONE', 'CANCELED'] },
      },
      data: { status },
    });
  }

  findByProjectId(projectId: string) {
    return this.prisma.task.findMany({
      where: { cardId: projectId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  getMaxSortOrder(projectId: string) {
    return this.prisma.task.aggregate({
      where: { cardId: projectId },
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
}

import type { PrismaClient } from '../generated/client.js';

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
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

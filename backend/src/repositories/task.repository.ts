import type {
  ComplexityLevel,
  PrismaClient,
  TaskStatus,
} from '../generated/client.js';

const taskSummaryInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  machine: {
    select: { id: true, name: true, costCenter: true },
  },
} as const;

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(taskId: string) {
    return this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        ...taskSummaryInclude,
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
      machineId?: string | null;
      complexityLevel?: ComplexityLevel | null;
      estimatedHours?: number | null;
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
        ...(data.machineId !== undefined ? { machineId: data.machineId } : {}),
        ...(data.complexityLevel !== undefined
          ? { complexityLevel: data.complexityLevel }
          : {}),
        ...(data.estimatedHours !== undefined
          ? { estimatedHours: data.estimatedHours }
          : {}),
      },
      include: taskSummaryInclude,
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
      include: taskSummaryInclude,
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
    machineId?: string;
    complexityLevel?: ComplexityLevel;
    sortOrder: number;
  }) {
    return this.prisma.task.create({
      data: {
        cardId: data.cardId,
        createdById: data.createdById,
        title: data.title,
        description: data.description ?? null,
        estimatedHours: data.estimatedHours ?? null,
        machineId: data.machineId ?? null,
        complexityLevel: data.complexityLevel ?? null,
        sortOrder: data.sortOrder,
      },
      include: taskSummaryInclude,
    });
  }

  softDelete(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
      include: taskSummaryInclude,
    });
  }

  softDeleteByProjectId(projectId: string) {
    return this.prisma.task.updateMany({
      where: { cardId: projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}

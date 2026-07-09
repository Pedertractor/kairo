import type { PrismaClient } from '../generated/client.js';

const partSelect = {
  id: true,
  name: true,
  code: true,
  timeToPrint: true,
} as const;

export class PrintingMachineRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.printingMachine.findMany({
      orderBy: { name: 'asc' },
      include: {
        threeDPart: {
          select: partSelect,
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.printingMachine.findUnique({
      where: { id },
      include: {
        threeDPart: {
          select: partSelect,
        },
      },
    });
  }

  create(data: { name: string; busy?: boolean }) {
    return this.prisma.printingMachine.create({
      data,
      include: {
        threeDPart: {
          select: partSelect,
        },
      },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      busy?: boolean;
      threeDPartId?: string | null;
    },
  ) {
    return this.prisma.printingMachine.update({
      where: { id },
      data,
      include: {
        threeDPart: {
          select: partSelect,
        },
      },
    });
  }

  delete(id: string) {
    return this.prisma.printingMachine.delete({
      where: { id },
    });
  }
}

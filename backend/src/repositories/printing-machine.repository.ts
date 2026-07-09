import type { PrismaClient } from '../generated/client.js';

export class PrintingMachineRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.printingMachine.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.printingMachine.findUnique({
      where: { id },
    });
  }

  create(data: { name: string; busy?: boolean }) {
    return this.prisma.printingMachine.create({ data });
  }

  update(
    id: string,
    data: {
      name?: string;
      busy?: boolean;
    },
  ) {
    return this.prisma.printingMachine.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.printingMachine.delete({
      where: { id },
    });
  }
}

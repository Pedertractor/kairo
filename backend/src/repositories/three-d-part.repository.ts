import type { PrismaClient } from '../generated/client.js';

export class ThreeDPartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.threeDPart.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.threeDPart.findUnique({
      where: { id },
    });
  }

  findByCode(code: string) {
    return this.prisma.threeDPart.findUnique({
      where: { code },
    });
  }

  create(data: { name: string; code: string; timeToPrint: number }) {
    return this.prisma.threeDPart.create({ data });
  }

  update(
    id: string,
    data: {
      name?: string;
      code?: string;
      timeToPrint?: number;
    },
  ) {
    return this.prisma.threeDPart.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.threeDPart.delete({
      where: { id },
    });
  }
}

import type { PrismaClient } from '../generated/client.js';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmployeeId(employeeId: string) {
    return this.prisma.user.findUnique({
      where: { employeeId },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}

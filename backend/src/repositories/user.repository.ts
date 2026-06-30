import type { PrismaClient, UnitType } from '../generated/client.js';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUnitAndCardNumber(unit: UnitType, cardNumber: string) {
    return this.prisma.user.findUnique({
      where: {
        unit_cardNumber: { unit, cardNumber },
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findAvailableForTeam(teamId: string, unit: UnitType) {
    return this.prisma.user.findMany({
      where: {
        unit,
        active: true,
        memberships: {
          none: { teamId },
        },
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, firstLogin: false },
    });
  }
}

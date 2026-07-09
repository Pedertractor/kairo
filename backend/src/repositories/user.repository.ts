import type { PrismaClient, UnitType, UserRole } from '../generated/client.js';

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

  findAll() {
    return this.prisma.user.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  updateRole(id: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  setActive(id: string, active: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { active },
    });
  }

  resetPassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, firstLogin: true },
    });
  }

  countActiveAdmins(excludeUserId?: string) {
    return this.prisma.user.count({
      where: {
        role: 'ADMIN',
        active: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
  }

  create(data: {
    employeeId: string;
    name: string;
    unit: UnitType;
    cardNumber: string;
    passwordHash: string;
    role: UserRole;
    printerOperator?: boolean;
  }) {
    return this.prisma.user.create({ data });
  }
}

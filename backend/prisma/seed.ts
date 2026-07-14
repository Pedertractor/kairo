import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, UnitType, UserRole } from '../src/generated/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD =
  process.env.DEFAULT_PASSWORD ?? 'change-me-default-password';

const ADMIN_USERS = [
  {
    name: 'TOMAS MORAIS NOGUEIRA',
    cardNumber: '8138',
    unit: UnitType.PEDERTRACTOR,
  },
  {
    name: 'JOAO GUILHERME HERREIRA GARNICA',
    cardNumber: '8139',
    unit: UnitType.PEDERTRACTOR,
  },
  {
    name: 'PEDRO HENRIQUE PRADO',
    cardNumber: '5487',
    unit: UnitType.PEDERTRACTOR,
  },
] as const;

function toEmployeeId(unit: UnitType, cardNumber: string) {
  return `${unit}-${cardNumber}`;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const user of ADMIN_USERS) {
    await prisma.user.upsert({
      where: {
        unit_cardNumber: { unit: user.unit, cardNumber: user.cardNumber },
      },
      update: {
        name: user.name,
        role: UserRole.ADMIN,
      },
      create: {
        employeeId: toEmployeeId(user.unit, user.cardNumber),
        name: user.name,
        unit: user.unit,
        cardNumber: user.cardNumber,
        passwordHash,
        role: UserRole.ADMIN,
        firstLogin: true,
      },
    });

    console.log(`Seeded admin: ${user.name} (${user.unit} / ${user.cardNumber})`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

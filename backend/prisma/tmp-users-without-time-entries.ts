import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: { not: 'LEADER' },
      timeEntries: { none: {} },
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
      cardNumber: true,
      unit: true,
      role: true,
      active: true,
    },
    orderBy: [{ unit: 'asc' }, { name: 'asc' }],
  })

  const dir = dirname(fileURLToPath(import.meta.url))
  const csvPath = join(dir, 'tmp-users-without-time-entries.csv')
  const header = 'name,employeeId,cardNumber,unit,role,active'
  const rows = users.map((user) =>
    [
      csvEscape(user.name),
      csvEscape(user.employeeId),
      csvEscape(user.cardNumber),
      user.unit,
      user.role,
      String(user.active),
    ].join(','),
  )

  writeFileSync(csvPath, [header, ...rows].join('\n') + '\n', 'utf8')
  console.log(`[tmp] ${users.length} user(s) with no time entries (excluding LEADER)`)
  console.log(`[tmp] Wrote ${csvPath}`)
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

main()
  .catch((error) => {
    console.error('Temp users-without-time-entries query failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

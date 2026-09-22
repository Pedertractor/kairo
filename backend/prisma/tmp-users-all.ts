import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatDate(value: Date | null | undefined) {
  if (!value) return ''
  return value.toISOString()
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      employeeId: true,
      cardNumber: true,
      unit: true,
      role: true,
      active: true,
      absent: true,
      firstLogin: true,
      createdAt: true,
      memberships: {
        where: { team: { active: true } },
        select: {
          role: true,
          team: { select: { name: true } },
        },
        orderBy: { team: { name: 'asc' } },
      },
      shiftPeriods: {
        where: { endedAt: null },
        select: { startMinutes: true, endMinutes: true },
        take: 1,
      },
      _count: { select: { timeEntries: true } },
    },
    orderBy: [{ unit: 'asc' }, { name: 'asc' }],
  })

  const dir = dirname(fileURLToPath(import.meta.url))
  const csvPath = join(dir, 'tmp-users-all.csv')
  const header = [
    'nome',
    'matricula',
    'numeroCartao',
    'unidade',
    'perfil',
    'ativo',
    'ausente',
    'primeiroLogin',
    'equipes',
    'turnoInicio',
    'turnoFim',
    'qtdApontamentos',
    'criadoEm',
  ].join(',')

  const rows = users.map((user) => {
    const shift = user.shiftPeriods[0]
    const teams = user.memberships
      .map((membership) => `${membership.team.name} (${membership.role})`)
      .join('; ')

    return [
      csvEscape(user.name),
      csvEscape(user.employeeId),
      csvEscape(user.cardNumber),
      user.unit,
      user.role,
      String(user.active),
      String(user.absent),
      String(user.firstLogin),
      csvEscape(teams),
      shift ? formatMinutesToTime(shift.startMinutes) : '',
      shift ? formatMinutesToTime(shift.endMinutes) : '',
      String(user._count.timeEntries),
      formatDate(user.createdAt),
    ].join(',')
  })

  writeFileSync(csvPath, [header, ...rows].join('\n') + '\n', 'utf8')
  console.log(`[tmp] ${users.length} user(s)`)
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
    console.error('Temp users-all query failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CLIENT_NAMES = [
  'CATERPILLAR',
  'CATERPILLAR - GERADORES',
  'CNH - CONTAGEM',
  'CNH - CURITIBA',
  'CNH - PIRACICABA',
  'CNH - SOROCABA',
  'CRUCIANELLI - PICCIN',
  'DYNAPAC',
  'HYUNDAI',
  'IVECO',
  'JACTO',
  'JCB',
  'JOHN DEERE - CATALÃO',
  'JOHN DEERE - HORIZONTINA',
  'JOHN DEERE - INDAIATUBA',
  'MOTOCANA',
  'PEDERTRACTOR',
  'PRAMAC GERADORES',
  'SILTOMAC',
  'TRIVELATO',
  'VOLVO',
] as const

async function main() {
  const result = await prisma.client.createMany({
    data: CLIENT_NAMES.map((name) => ({ name })),
    skipDuplicates: true,
  })

  const total = await prisma.client.count()

  console.log(`Clients inserted: ${result.count}`)
  console.log(`Clients total: ${total}`)
}

main()
  .catch((error) => {
    console.error('Client seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

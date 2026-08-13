import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const [linkCount, costCenterCount] = await Promise.all([
    prisma.teamCostCenter.count(),
    prisma.costCenter.count(),
  ])

  console.log(
    `[tmp] Removing ${linkCount} team–cost-center link(s) and ${costCenterCount} cost center(s)...`,
  )

  const deletedLinks = await prisma.teamCostCenter.deleteMany()
  const deletedCostCenters = await prisma.costCenter.deleteMany()

  console.log(`[tmp] TeamCostCenter deleted: ${deletedLinks.count}`)
  console.log(`[tmp] CostCenter deleted: ${deletedCostCenters.count}`)
}

main()
  .catch((error) => {
    console.error('Temp cost-center reset failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

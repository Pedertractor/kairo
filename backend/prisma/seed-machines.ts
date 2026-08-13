import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const MACHINES = [
  { name: 'ERGOMAT', costCenter: '2425' },
  { name: 'FCP 5040', costCenter: '2433' },
  { name: 'HAAS', costCenter: '2433' },
  { name: 'HAAS MAGNÉTICA', costCenter: '2433' },
  { name: 'HELLER MCA H 150', costCenter: '2436' },
  { name: 'HELLER MCH 350', costCenter: '2432' },
  { name: 'HELLER MCH 460', costCenter: '2432' },
  { name: 'HELLER PFH HEIDENHAIN', costCenter: '2434' },
  { name: 'HELLER PFH V10 1000', costCenter: '2434' },
  { name: 'INDEX MC 200', costCenter: '2424' },
  { name: 'INDEX MC 400', costCenter: '2421' },
  { name: 'MAZAK NEXUS', costCenter: '2422' },
  { name: 'MAZAK VTC', costCenter: '2437' },
  { name: 'NARDINI', costCenter: '2423' },
  { name: 'PETRUS', costCenter: '2431' },
  { name: 'ROMI CENTUR 30D', costCenter: '2423' },
  { name: 'ROMI DISCOVERY 1250', costCenter: '2431' },
  { name: 'ROMI VTC 560B', costCenter: '2438' },
  { name: 'SKYBULL', costCenter: '2431' },
  { name: 'SORALUCE', costCenter: '2437' },
  { name: 'UNION', costCenter: '2435' },
  { name: 'WOTAN', costCenter: '2435' },
  { name: 'Robô Industrial Mesa', costCenter: '3262' },
  { name: 'Robô Industrial Orbital', costCenter: '3263' },
  { name: 'Robô Industrial Tanque', costCenter: '3250' },
  { name: 'Robô Industrial Giratório', costCenter: '3261' },
  { name: 'Robô Industrial Tractor', costCenter: '3253' },
  { name: 'Prensa', costCenter: '2211' },
  { name: 'Puncionadeira', costCenter: '2125' },
  { name: 'Prensa Tipagem', costCenter: '2213' },
  { name: 'Laser', costCenter: '2110' },
  { name: 'Laser 3D', costCenter: '2112' },
  { name: 'Oxicorte', costCenter: '2115' },
  { name: 'Plasma', costCenter: '2120' },
  { name: 'Plasma 3D', costCenter: '2121' },
  { name: 'Dobra Pequena', costCenter: '2251' },
  { name: 'Dobra Média', costCenter: '2261' },
  { name: 'Dobra Grande', costCenter: '2271' },
] as const

async function main() {
  const existingCount = await prisma.machine.count()

  if (existingCount === 0) {
    console.log('Machines table empty — seeding machines...')
  } else {
    console.log(
      `Machines table has ${existingCount} row(s) — inserting missing only (no updates)`,
    )
  }

  // skipDuplicates: never overwrites existing machine rows (name / costCenter)
  const result = await prisma.machine.createMany({
    data: MACHINES.map((machine) => ({
      name: machine.name,
      costCenter: machine.costCenter,
    })),
    skipDuplicates: true,
  })

  const total = await prisma.machine.count()

  console.log(`Machines inserted: ${result.count}`)
  console.log(`Machines total: ${total}`)
}

main()
  .catch((error) => {
    console.error('Machine seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import type { InfractionLeader, InfractionsReport } from '../types/infraction.ts'

export function filterInfractionsByLeader(report: InfractionsReport, leader: InfractionLeader | null): InfractionsReport {
  if (!leader) return report
  const members = new Set(leader.members.map((member) => JSON.stringify([member.unit, member.cardNumber])))
  const people = report.people.filter((person) => members.has(JSON.stringify([person.unit, person.cardNumber])))
  return {
    ...report,
    people,
    totalPeople: people.length,
    totalInfractions: people.reduce((total, person) => total + person.infractionCount, 0),
  }
}

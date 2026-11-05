export interface InfractionTimeSummary {
  percent: number
  loggedSeconds: number
  workedSeconds: number
}

export interface Infraction extends InfractionTimeSummary {
  date: string
  type: string
}

export interface InfractionPerson {
  name: string
  cardNumber: string
  unit: string
  monthlyAverage: Omit<InfractionTimeSummary, 'percent'> & { percent: number | null }
  infractionCount: number
  infractions: Infraction[]
}

export interface InfractionsReport {
  month: number
  year: number
  totalPeople: number
  totalInfractions: number
  people: InfractionPerson[]
}

export interface InfractionLeader {
  id: string
  name: string
  members: { unit: string; cardNumber: string }[]
}

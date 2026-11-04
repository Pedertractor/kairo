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
  monthlyAverage: InfractionTimeSummary
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

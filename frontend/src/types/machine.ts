export interface MachineSummary {
  id: string
  name: string
  costCenter: string
}

export interface MachinesListResponse {
  machines: MachineSummary[]
}

export interface CostCenterSummary {
  id: string
  costCenter: string
  description: string
}

export interface CostCentersListResponse {
  costCenters: CostCenterSummary[]
}

export interface CostCentersSyncResponse {
  synced: number
  costCenters: CostCenterSummary[]
}

export interface SetTeamCostCentersInput {
  costCenterIds: string[]
}

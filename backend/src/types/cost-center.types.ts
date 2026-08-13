export interface ExternalCostCenter {
  CCUSTO: string;
  DESCRICAO: string;
  STATUS: boolean;
}

export interface CostCenterSummary {
  id: string;
  costCenter: string;
  description: string;
}

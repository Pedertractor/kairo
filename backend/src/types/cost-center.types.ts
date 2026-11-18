export interface ExternalCostCenter {
  CCUSTO: string;
  DESCRICAO: string;
  AGRUPA?: string;
  LIDER_DIA_CRACHA?: number;
  LIDER_DIA_NOME?: string;
  LIDER_NOITE_CRACHA?: number;
  LIDER_NOITE_NOME?: string;
  SUPERVISOR_DIA_CRACHA?: number;
  SUPERVISOR_DIA_NOME?: string;
  SUPERVISOR_NOITE_CRACHA?: number;
  SUPERVISOR_NOITE_NOME?: string;
  GERENTE_CRACHA?: number;
  GERENTE?: string;
  PRODUTIVO?: boolean;
  STATUS: boolean;
}

export interface CostCenterSummary {
  id: string;
  costCenter: string;
  description: string;
}

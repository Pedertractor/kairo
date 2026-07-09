export interface PrintingMachinePartSummary {
  id: string;
  name: string;
  code: string;
  timeToPrint: number;
}

export interface PrintingMachineSummary {
  id: string;
  name: string;
  busy: boolean;
  part: PrintingMachinePartSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrintingMachine {
  id: string
  name: string
  busy: boolean
  createdAt: string
  updatedAt: string
}

export interface PrintingMachinesListResponse {
  printingMachines: PrintingMachine[]
}

export interface PrintingMachineResponse {
  printingMachine: PrintingMachine
}

export interface CreatePrintingMachineInput {
  name: string
  busy?: boolean
}

export interface UpdatePrintingMachineInput {
  name?: string
  busy?: boolean
}

export interface PrintingMachinePart {
  id: string
  name: string
  code: string
  timeToPrint: number
}

export interface PrintingMachine {
  id: string
  name: string
  busy: boolean
  part: PrintingMachinePart | null
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
  threeDPartId?: string | null
}

export interface ThreeDPart {
  id: string
  name: string
  code: string
  timeToPrint: number
  createdAt: string
  updatedAt: string
}

export interface ThreeDPartsListResponse {
  threeDParts: ThreeDPart[]
}

export interface ThreeDPartResponse {
  threeDPart: ThreeDPart
}

export interface CreateThreeDPartInput {
  name: string
  code: string
  timeToPrint: number
}

export interface UpdateThreeDPartInput {
  name?: string
  code?: string
  timeToPrint?: number
}

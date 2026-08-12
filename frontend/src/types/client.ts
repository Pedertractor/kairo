export interface ClientSummary {
  id: string
  name: string
}

export interface ClientsListResponse {
  clients: ClientSummary[]
}

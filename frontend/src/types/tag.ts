export interface ActivityTag {
  id: string
  name: string
  color: string
}

export interface TagSummary {
  id: string
  teamId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface TagsListResponse {
  tags: TagSummary[]
}

export interface TagResponse {
  tag: TagSummary
}

export interface CreateTagInput {
  name: string
  color: string
}

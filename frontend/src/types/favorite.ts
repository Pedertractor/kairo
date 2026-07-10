export type FavoriteWorkItemKind = 'ACTIVITY' | 'TASK'

export interface FavoriteWorkItem {
  kind: FavoriteWorkItemKind
  id: string
  title: string
  teamId: string
  teamName: string
  status: string
  parentTitle: string | null
  canStartTimer: boolean
  activityId: string | null
  projectId: string | null
  taskId: string | null
  favoritedAt: string
}

export interface FavoritesListResponse {
  favorites: FavoriteWorkItem[]
}

export interface ToggleFavoriteResponse {
  isFavorite: boolean
}

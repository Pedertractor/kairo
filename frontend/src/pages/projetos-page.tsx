import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CardTimeBudget } from '@/components/card-time-budget'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import {
  CARD_STATUSES,
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  STATUS_LABELS,
} from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { CardStatus, ProjectSummary, ProjectsListResponse } from '@/types/card'

const ALL_STATUSES = 'ALL' as const
type StatusFilter = CardStatus | typeof ALL_STATUSES

function getStatusFilterLabel(value: StatusFilter): string {
  if (value === ALL_STATUSES) {
    return 'Todos'
  }

  return STATUS_LABELS[value]
}

export function ProjetosPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES)

  const loadProjects = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await api<ProjectsListResponse>('/projects')
      setProjects(data.projects)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const filteredProjects = useMemo(() => {
    const query = nameFilter.trim().toLowerCase()

    return projects.filter((project) => {
      const matchesName =
        query === '' || project.title.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === ALL_STATUSES || project.status === statusFilter

      return matchesName && matchesStatus
    })
  }, [projects, nameFilter, statusFilter])

  const hasActiveFilters =
    nameFilter.trim() !== '' || statusFilter !== ALL_STATUSES

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Projetos</h1>
        <p className="text-sm text-muted-foreground">
          Projetos das suas equipes.
        </p>
      </div>

      {!isLoading && projects.length > 0 ? (
        <div className="flex w-full flex-col gap-3 sm:w-1/2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Buscar por nome..."
              className="pl-8"
              aria-label="Buscar projetos por nome"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por status">
              <SelectValue placeholder="Status">
                {(selectedValue) =>
                  getStatusFilterLabel(selectedValue as StatusFilter)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Todos</SelectItem>
              {CARD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhum projeto ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Os projetos das suas equipes aparecerão aqui.
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Nenhum projeto encontrado</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Tente ajustar os filtros de busca ou status.'
              : 'Os projetos das suas equipes aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projetos/${project.id}`}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50',
                  CARD_STATUS_CARD_CLASS[project.status],
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{project.title}</span>
                  <span
                    className={cn(
                      'shrink-0',
                      CARD_STATUS_BADGE_CLASS[project.status],
                    )}
                  >
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>
                {project.teamName ? (
                  <p className="text-xs text-muted-foreground">
                    {project.teamName}
                  </p>
                ) : null}
                {project.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {project.description}
                  </p>
                ) : null}
                <CardTimeBudget
                  loggedSeconds={project.loggedSeconds}
                  estimatedHours={project.estimatedHours}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CardTimeBudget } from '@/components/card-time-budget'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { FinishItemButton } from '@/components/finish-item-button'
import { FinishProjectDialog } from '@/components/finish-project-dialog'
import { Button } from '@/components/ui/button'
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
  canFinishStatus,
  CARD_STATUSES,
  CARD_STATUS_BADGE_CLASS,
  CARD_STATUS_CARD_CLASS,
  isFinishedStatus,
  STATUS_LABELS,
} from '@/lib/card-status'
import { cn } from '@/lib/utils'
import type { CardStatus, ProjectSummary, ProjectsListResponse } from '@/types/card'

const ALL_STATUSES = 'ALL' as const
type StatusFilter = CardStatus | typeof ALL_STATUSES

const VISIBILITY_ACTIVE = 'active'
const VISIBILITY_ALL = 'all'

function getStatusFilterLabel(value: StatusFilter): string {
  if (value === ALL_STATUSES) {
    return 'Todos os status'
  }

  return STATUS_LABELS[value]
}

export function ProjetosPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectToFinish, setProjectToFinish] =
    useState<ProjectSummary | null>(null)
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES)
  const [visibilityFilter, setVisibilityFilter] = useState(VISIBILITY_ACTIVE)

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
    const showFinished =
      visibilityFilter === VISIBILITY_ALL || statusFilter === 'DONE'

    return projects.filter((project) => {
      if (!showFinished && isFinishedStatus(project.status)) {
        return false
      }

      const matchesName =
        query === '' || project.title.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === ALL_STATUSES || project.status === statusFilter

      return matchesName && matchesStatus
    })
  }, [projects, nameFilter, statusFilter, visibilityFilter])

  const hasActiveFilters =
    nameFilter.trim() !== '' ||
    statusFilter !== ALL_STATUSES ||
    visibilityFilter !== VISIBILITY_ACTIVE
  const hasFinishedHidden =
    visibilityFilter === VISIBILITY_ACTIVE &&
    projects.some((project) => isFinishedStatus(project.status))

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Projetos das suas equipes.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Criar novo projeto
        </Button>
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={loadProjects}
      />

      <FinishProjectDialog
        teamId={projectToFinish?.teamId ?? ''}
        project={projectToFinish}
        open={projectToFinish !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToFinish(null)
          }
        }}
        onFinished={loadProjects}
      />

      {!isLoading && projects.length > 0 ? (
        <div className="flex w-full flex-col gap-3 sm:w-3/4 sm:flex-row">
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
              value={visibilityFilter}
              onValueChange={(value) =>
                setVisibilityFilter(value ?? VISIBILITY_ACTIVE)
              }
            >
              <SelectTrigger className="w-full" aria-label="Filtrar concluídos">
                <SelectValue>
                  {(selectedValue) =>
                    selectedValue === VISIBILITY_ALL ? 'Todos' : 'Ativos'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VISIBILITY_ACTIVE}>Ativos</SelectItem>
                <SelectItem value={VISIBILITY_ALL}>Todos</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value={ALL_STATUSES}>Todos os status</SelectItem>
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
            {hasFinishedHidden && !hasActiveFilters
              ? 'Há projetos concluídos ocultos. Selecione "Todos" para exibi-los.'
              : hasActiveFilters
                ? 'Tente ajustar os filtros de busca ou status.'
                : 'Os projetos das suas equipes aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <li
              key={project.id}
              className={cn(
                'relative flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50',
                CARD_STATUS_CARD_CLASS[project.status],
              )}
            >
              <Link
                to={`/projetos/${project.id}`}
                className="absolute inset-0 rounded-lg"
                aria-label={project.title}
              />
              <div className="pointer-events-none relative z-10 flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{project.title}</span>
                <div className="pointer-events-auto flex shrink-0 items-center gap-0.5">
                  {canFinishStatus(project.status) ? (
                    <FinishItemButton
                      onClick={() => setProjectToFinish(project)}
                    />
                  ) : null}
                  <span
                    className={cn(
                      'shrink-0',
                      CARD_STATUS_BADGE_CLASS[project.status],
                    )}
                  >
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>
              </div>
              {project.teamName ? (
                <p className="pointer-events-none relative z-10 text-xs text-muted-foreground">
                  {project.teamName}
                </p>
              ) : null}
              {project.description ? (
                <p className="pointer-events-none relative z-10 line-clamp-2 text-xs text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
              <div className="pointer-events-none relative z-10">
                <CardTimeBudget
                  loggedSeconds={project.loggedSeconds}
                  estimatedHours={project.estimatedHours}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

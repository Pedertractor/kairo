import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-handler'
import { STATUS_LABELS } from '@/lib/card-status'
import { CardTimeBudget } from '@/components/card-time-budget'
import type { ProjectSummary, ProjectsListResponse } from '@/types/card'

export function ProjetosPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Projetos</h1>
        <p className="text-sm text-muted-foreground">
          Projetos das suas equipes.
        </p>
      </div>

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
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projetos/${project.id}`}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{project.title}</span>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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

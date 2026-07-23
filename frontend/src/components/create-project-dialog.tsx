import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import type { CreateProjectInput, ProjectResponse } from '@/types/card'
import type { TeamSummary, TeamsListResponse } from '@/types/team'

interface CreateProjectDialogProps {
  teamId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateProjectDialog({
  teamId: fixedTeamId,
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const requiresTeamSelection = fixedTeamId === undefined
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !requiresTeamSelection) {
      return
    }

    let cancelled = false

    async function loadTeams() {
      setIsLoadingTeams(true)

      try {
        const data = await api<TeamsListResponse>('/teams')
        if (!cancelled) {
          setTeams(data.teams)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTeams(false)
        }
      }
    }

    void loadTeams()

    return () => {
      cancelled = true
    }
  }, [open, requiresTeamSelection])

  function resetForm() {
    setSelectedTeamId('')
    setTitle('')
    setDescription('')
    setEstimatedHours('')
  }

  const teamId = fixedTeamId ?? selectedTeamId

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!teamId) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: CreateProjectInput = { title: title.trim() }
      const trimmedDescription = description.trim()
      const parsedHours = estimatedHours.trim()
        ? Number.parseFloat(estimatedHours)
        : undefined

      if (trimmedDescription) {
        payload.description = trimmedDescription
      }

      if (parsedHours !== undefined && !Number.isNaN(parsedHours)) {
        payload.estimatedHours = parsedHours
      }

      await api<ProjectResponse>(`/teams/${teamId}/projects`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      resetForm()
      onOpenChange(false)
      onCreated()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar novo projeto</DialogTitle>
            <DialogDescription>
              {requiresTeamSelection
                ? 'Selecione a equipe e preencha os dados para criar um novo projeto.'
                : 'Preencha os dados para criar um novo projeto nesta equipe.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            {requiresTeamSelection ? (
              <Field>
                <FieldLabel htmlFor="project-team">Equipe</FieldLabel>
                <Select
                  value={selectedTeamId || undefined}
                  onValueChange={setSelectedTeamId}
                  disabled={isSubmitting || isLoadingTeams}
                >
                  <SelectTrigger id="project-team" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingTeams
                          ? 'Carregando equipes...'
                          : 'Selecione uma equipe'
                      }
                    >
                      {(value) =>
                        teams.find((team) => team.id === value)?.name ??
                        'Selecione uma equipe'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="project-title">Título</FieldLabel>
              <Input
                id="project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título do projeto"
                required
                disabled={isSubmitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-description">Descrição</FieldLabel>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                disabled={isSubmitting}
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-estimated-hours">
                Horas estimadas
              </FieldLabel>
              <Input
                id="project-estimated-hours"
                type="number"
                min="0"
                step="0.25"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                placeholder="Ex.: 40"
                disabled={isSubmitting}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !teamId}
            >
              {isSubmitting ? 'Criando...' : 'Criar projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import dayjs from 'dayjs'

import { CostCenterMultiSelect } from '@/components/cost-center-multi-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-handler'
import type { TeamResponse, TeamSummary, UpdateTeamInput } from '@/types/team'

interface TeamDetailsDialogProps {
  team: TeamSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (team: TeamSummary) => void
}

function costCenterIdsOf(team: TeamSummary | null) {
  return (team?.costCenters ?? []).map((item) => item.id)
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  const set = new Set(left)
  return right.every((id) => set.has(id))
}

export function TeamDetailsDialog({
  team,
  open,
  onOpenChange,
  onUpdated,
}: TeamDetailsDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [costCenterIds, setCostCenterIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canEdit = team?.role === 'ADMIN'

  useEffect(() => {
    if (open && team) {
      setName(team.name)
      setDescription(team.description ?? '')
      setCostCenterIds(costCenterIdsOf(team))
    }
  }, [open, team])

  function buildPayload(current: TeamSummary): UpdateTeamInput {
    const payload: UpdateTeamInput = {}

    const nextName = name.trim()
    if (nextName && nextName !== current.name) {
      payload.name = nextName
    }

    const nextDescription = description.trim() || null
    if (nextDescription !== (current.description ?? null)) {
      payload.description = nextDescription
    }

    return payload
  }

  const costCentersChanged =
    team !== null && !sameIds(costCenterIds, costCenterIdsOf(team))

  const hasChanges =
    team !== null &&
    name.trim() !== '' &&
    (Object.keys(buildPayload(team)).length > 0 || costCentersChanged)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!team || !canEdit || !hasChanges) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = buildPayload(team)
      let updated = team

      if (Object.keys(payload).length > 0) {
        const data = await api<TeamResponse>(`/teams/${team.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        updated = data.team
      }

      if (costCentersChanged) {
        const data = await api<TeamResponse>(
          `/teams/${team.id}/cost-centers`,
          {
            method: 'PUT',
            body: JSON.stringify({ costCenterIds }),
            toastOnSuccess: Object.keys(payload).length > 0 ? false : true,
          },
        )
        updated = data.team
      }

      onOpenChange(false)
      onUpdated(updated)
    } finally {
      setIsSubmitting(false)
    }
  }

  const adminNames =
    team?.members
      .filter((member) => member.role === 'ADMIN')
      .map((member) => member.name) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Detalhes da equipe</DialogTitle>
            <DialogDescription>
              {canEdit
                ? 'Visualize e edite as informações desta equipe.'
                : 'Visualize as informações desta equipe.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="team-details-name">Nome</FieldLabel>
              <Input
                id="team-details-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da equipe"
                required
                disabled={isSubmitting || !canEdit}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="team-details-description">
                Descrição
              </FieldLabel>
              <Textarea
                id="team-details-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição opcional"
                rows={3}
                disabled={isSubmitting || !canEdit}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="team-cost-centers">
                Centros de custo
              </FieldLabel>
              <CostCenterMultiSelect
                selectedIds={costCenterIds}
                onSelectedIdsChange={setCostCenterIds}
                extraCostCenters={team?.costCenters ?? []}
                disabled={isSubmitting || !canEdit}
                enabled={open}
              />
              {canEdit ? (
                <FieldDescription>
                  Opcional. Uma equipe pode ter um ou mais centros de custo.
                </FieldDescription>
              ) : null}
            </Field>

            {team ? (
              <>
                <Separator />
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <p>
                    {team.memberCount}{' '}
                    {team.memberCount === 1 ? 'membro' : 'membros'}
                  </p>
                  {adminNames.length > 0 ? (
                    <p>
                      {adminNames.length === 1
                        ? 'Administrador: '
                        : 'Administradores: '}
                      {adminNames.join(', ')}
                    </p>
                  ) : null}
                  <p>
                    Criada em{' '}
                    {dayjs(team.createdAt).format('DD/MM/YYYY [às] HH:mm')}
                  </p>
                </div>
              </>
            ) : null}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {canEdit ? 'Cancelar' : 'Fechar'}
            </Button>
            {canEdit ? (
              <Button type="submit" disabled={isSubmitting || !hasChanges}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

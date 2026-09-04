import { useState } from 'react'

import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api-handler'
import type { TeamResponse, TeamSummary, UpdateTeamInput } from '@/types/team'

interface TeamSettingsSectionProps {
  team: TeamSummary
  onTeamUpdated: (team: TeamSummary) => void
}

export function TeamSettingsSection({
  team,
  onTeamUpdated,
}: TeamSettingsSectionProps) {
  const [pendingField, setPendingField] = useState<keyof UpdateTeamInput | null>(
    null,
  )

  async function updateFlag(
    field: keyof Pick<
      UpdateTeamInput,
      | 'membersCanCreateActivities'
      | 'membersCanCreateProjects'
      | 'membersCanViewTimeline'
    >,
    value: boolean,
  ) {
    setPendingField(field)

    try {
      const data = await api<TeamResponse>(`/teams/${team.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      })
      onTeamUpdated(data.team)
    } finally {
      setPendingField(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">Permissões da equipe</p>
        <p className="text-sm text-muted-foreground">
          Defina o que os membros podem fazer nesta equipe. Administradores
          sempre têm acesso.
        </p>
      </div>

      <FieldGroup className="max-w-xl">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="members-can-create-activities">
              Todos podem criar atividades
            </FieldLabel>
            <FieldDescription>
              Quando desativado, apenas administradores da equipe podem criar
              atividades.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="members-can-create-activities"
            checked={team.membersCanCreateActivities}
            disabled={pendingField !== null}
            onCheckedChange={(checked) =>
              void updateFlag('membersCanCreateActivities', checked)
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="members-can-create-projects">
              Todos podem criar projetos
            </FieldLabel>
            <FieldDescription>
              Quando desativado, apenas administradores da equipe podem criar
              projetos.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="members-can-create-projects"
            checked={team.membersCanCreateProjects}
            disabled={pendingField !== null}
            onCheckedChange={(checked) =>
              void updateFlag('membersCanCreateProjects', checked)
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="members-can-view-timeline">
              Todos podem ver a timeline da equipe
            </FieldLabel>
            <FieldDescription>
              Quando desativado, apenas administradores da equipe veem a
              timeline.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="members-can-view-timeline"
            checked={team.membersCanViewTimeline}
            disabled={pendingField !== null}
            onCheckedChange={(checked) =>
              void updateFlag('membersCanViewTimeline', checked)
            }
          />
        </Field>
      </FieldGroup>
    </div>
  )
}

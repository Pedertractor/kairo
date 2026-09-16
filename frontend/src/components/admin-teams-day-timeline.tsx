import { useState } from 'react'

import { TeamDayTimeline } from '@/components/team-day-timeline'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ALL_TEAMS,
  useAdminTeamsDayDashboard,
} from '@/hooks/use-admin-teams-day-dashboard'
import { toDateKey } from '@/lib/date'

export function AdminTeamsDayTimeline() {
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [teamFilter, setTeamFilter] = useState(ALL_TEAMS)
  const { teams, members, blocks, absences, isLoading } =
    useAdminTeamsDayDashboard(selectedDate, teamFilter)

  return (
    <div className='min-w-0 max-w-full'>
      <TeamDayTimeline
        title='Timeline das equipes'
        blocks={blocks}
        absences={absences}
        members={members}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isLoading={isLoading}
        headerExtra={
          teams.length > 1 ? (
            <Select
              value={teamFilter}
              onValueChange={(value) => setTeamFilter(value ?? ALL_TEAMS)}
            >
              <SelectTrigger
                size='sm'
                className='min-w-40 max-w-52'
                aria-label='Filtrar por equipe'
              >
                <SelectValue placeholder='Todas as equipes'>
                  {(value) =>
                    value === ALL_TEAMS
                      ? 'Todas as equipes'
                      : (teams.find((team) => team.id === value)?.name ??
                        'Todas as equipes')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TEAMS}>Todas as equipes</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />
    </div>
  )
}

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

const COLOR_BY_MEMBER = 'member'
const COLOR_BY_TAG = 'tag'

const COLOR_MODE_LABELS = {
  [COLOR_BY_MEMBER]: 'Por funcionário',
  [COLOR_BY_TAG]: 'Por tag',
} as const

export function AdminTeamsDayTimeline() {
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [teamFilter, setTeamFilter] = useState(ALL_TEAMS)
  const [colorMode, setColorMode] = useState(COLOR_BY_MEMBER)
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
        colorBlocksByTag={colorMode === COLOR_BY_TAG}
        headerExtra={
          <div className='flex flex-wrap items-center gap-2'>
            <Select
              value={colorMode}
              onValueChange={(value) =>
                setColorMode(value === COLOR_BY_TAG ? COLOR_BY_TAG : COLOR_BY_MEMBER)
              }
            >
              <SelectTrigger
                size='sm'
                className='min-w-40 max-w-52'
                aria-label='Colorir timeline'
              >
                <SelectValue placeholder={COLOR_MODE_LABELS[COLOR_BY_MEMBER]}>
                  {(value) =>
                    COLOR_MODE_LABELS[
                      value === COLOR_BY_TAG ? COLOR_BY_TAG : COLOR_BY_MEMBER
                    ]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COLOR_BY_MEMBER}>
                  {COLOR_MODE_LABELS[COLOR_BY_MEMBER]}
                </SelectItem>
                <SelectItem value={COLOR_BY_TAG}>
                  {COLOR_MODE_LABELS[COLOR_BY_TAG]}
                </SelectItem>
              </SelectContent>
            </Select>

            {teams.length > 1 ? (
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
            ) : null}
          </div>
        }
      />
    </div>
  )
}

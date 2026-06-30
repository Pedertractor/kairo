import { Link } from 'react-router-dom'

import { RecentWorkItemsCard } from '@/components/recent-work-items-card'
import { Button } from '@/components/ui/button'
import {
  formatLongDate,
  getFirstName,
  getGreeting,
} from '@/lib/greeting'
import { useAuth } from '@/hooks/use-auth'

export function HomePage() {
  const { user } = useAuth()
  const greeting = getGreeting()
  const firstName = user?.name ? getFirstName(user.name) : ''
  const todayLabel = formatLongDate()

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>

        <Button render={<Link to="/equipes" />}>Ver equipes</Button>
      </div>

      <RecentWorkItemsCard />
    </div>
  )
}

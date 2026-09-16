import { useState } from 'react'
import { Users } from 'lucide-react'

import { CreateTeamDialog } from '@/components/create-team-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

interface NoTeamMessageProps {
  onCreateTeam?: () => void
  onCreated?: () => void | Promise<void>
}

export function NoTeamMessage({ onCreateTeam, onCreated }: NoTeamMessageProps) {
  const { user, refreshUser } = useAuth()
  const canCreateTeam = user?.role === 'ADMIN' || user?.role === 'LEADER'
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  function handleCreateClick() {
    if (onCreateTeam) {
      onCreateTeam()
      return
    }

    setIsCreateDialogOpen(true)
  }

  async function handleCreated() {
    await refreshUser()
    await onCreated?.()
  }

  return (
    <>
      <Card className="gap-0 rounded-xl border border-dashed bg-muted/30 py-0 shadow-none">
        <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
          <Users className="size-6 text-muted-foreground/70" />
          {canCreateTeam ? (
            <>
              <p className="max-w-md text-sm font-medium">
                Você ainda não tem uma equipe. Crie a primeira para começar a
                organizar membros, projetos e apontamentos.
              </p>
              <Button onClick={handleCreateClick}>Criar equipe</Button>
            </>
          ) : (
            <p className="max-w-md text-sm font-medium">
              Parece que você ainda não tem uma equipe, solicite para seu
              superior para te adicionar em alguma equipe
            </p>
          )}
        </CardContent>
      </Card>

      {canCreateTeam && !onCreateTeam ? (
        <CreateTeamDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreated={() => {
            void handleCreated()
          }}
        />
      ) : null}
    </>
  )
}

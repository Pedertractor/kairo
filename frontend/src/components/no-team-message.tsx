import { Users } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export function NoTeamMessage() {
  return (
    <Card className="gap-0 rounded-xl border border-dashed bg-muted/30 py-0 shadow-none">
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center">
        <Users className="size-6 text-muted-foreground/70" />
        <p className="max-w-md text-sm font-medium">
          Parece que você ainda não tem uma equipe, solicite para seu superior
          para te adicionar em alguma equipe
        </p>
      </CardContent>
    </Card>
  )
}

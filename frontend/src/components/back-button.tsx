import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useBackNavigation } from '@/hooks/use-back-navigation'

type BackButtonProps = {
  fallbackTo: string
  fallbackLabel: string
}

export function BackButton({ fallbackTo, fallbackLabel }: BackButtonProps) {
  const { canGoBack, goBack } = useBackNavigation(fallbackTo)

  if (canGoBack) {
    return (
      <Button variant="ghost" size="sm" onClick={goBack}>
        <ArrowLeft />
        Voltar
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="sm" render={<Link to={fallbackTo} />}>
      <ArrowLeft />
      {fallbackLabel}
    </Button>
  )
}

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { LoginPage } from '@/pages/login-page'

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Bem-vindo(a)</p>
        <h1 className="text-2xl font-bold">{user?.name}</h1>
      </div>
      <Button variant="outline" onClick={() => void logout()}>
        Sair
      </Button>
    </div>
  )
}

export default App

import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/app-layout'
import { useAuth } from '@/hooks/use-auth'
import { ChangePasswordPage } from '@/pages/change-password-page'
import { HomePage } from '@/pages/home-page'
import { LoginPage } from '@/pages/login-page'
import { ActivityDetailPage } from '@/pages/activity-detail-page'
import { TeamDetailPage } from '@/pages/team-detail-page'
import { ProjectDetailPage } from '@/pages/project-detail-page'
import { ProjetosPage } from '@/pages/projetos-page'
import { TeamsPage } from '@/pages/teams-page'

function ProtectedRoute({
  children,
  title = 'Início',
  hideHeader = false,
  mainClassName,
}: {
  children: React.ReactNode
  title?: string
  hideHeader?: boolean
  mainClassName?: string
}) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout
      title={title}
      hideHeader={hideHeader}
      mainClassName={mainClassName}
    >
      {children}
    </AppLayout>
  )
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const { isAuthenticated, isLoading, pendingPasswordChange } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (pendingPasswordChange) {
    return <ChangePasswordPage />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute hideHeader mainClassName="bg-[#F8F9FB]">
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipes"
        element={
          <ProtectedRoute title="Equipes">
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos"
        element={
          <ProtectedRoute title="Projetos">
            <ProjetosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/:projectId"
        element={
          <ProtectedRoute title="Projeto">
            <ProjectDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipes/:teamId"
        element={
          <ProtectedRoute title="Equipe">
            <TeamDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipes/:teamId/atividades/:activityId"
        element={
          <ProtectedRoute title="Atividade">
            <ActivityDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />}
      />
    </Routes>
  )
}

export default App

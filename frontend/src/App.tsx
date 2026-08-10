import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/app-layout'
import { useAuth } from '@/hooks/use-auth'
import { AnalyticsPage } from '@/pages/analytics-page'
import { ChangePasswordPage } from '@/pages/change-password-page'
import { HomePage } from '@/pages/home-page'
import { LoginPage } from '@/pages/login-page'
import { ActivityDetailPage } from '@/pages/activity-detail-page'
import { TeamDetailPage } from '@/pages/team-detail-page'
import { ProjectDetailPage } from '@/pages/project-detail-page'
import { TaskDetailPage } from '@/pages/task-detail-page'
import { ApontamentosPage } from '@/pages/apontamentos-page'
import { ProjetosPage } from '@/pages/projetos-page'
import { TeamsPage } from '@/pages/teams-page'
import { UsuariosPage } from '@/pages/usuarios-page'

function ProtectedRoute({
  children,
  title = 'Início',
  hideHeader = false,
  mainClassName,
  requireAdmin = false,
  requireAdminOrLeader = false,
  requireTeamOwner = false,
}: {
  children: React.ReactNode
  title?: string
  hideHeader?: boolean
  mainClassName?: string
  requireAdmin?: boolean
  requireAdminOrLeader?: boolean
  requireTeamOwner?: boolean
}) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  if (
    requireAdminOrLeader &&
    user?.role !== 'ADMIN' &&
    user?.role !== 'LEADER'
  ) {
    return <Navigate to="/" replace />
  }

  if (requireTeamOwner && !user?.hasOwnedTeams) {
    return <Navigate to="/" replace />
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
          <ProtectedRoute key="home" hideHeader mainClassName="bg-background">
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipes"
        element={
          <ProtectedRoute key="equipes" title="Equipes">
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos"
        element={
          <ProtectedRoute key="projetos" title="Projetos">
            <ProjetosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/apontamentos"
        element={
          <ProtectedRoute key="apontamentos" title="Apontamentos">
            <ApontamentosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute key="analytics" title="Analytics" requireTeamOwner>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute
            key="usuarios"
            title="Usuários"
            requireAdminOrLeader
          >
            <UsuariosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/:projectId/tarefas/:taskId"
        element={
          <ProtectedRoute key="tarefa" title="Tarefa">
            <TaskDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/:projectId"
        element={
          <ProtectedRoute key="projeto" title="Projeto">
            <ProjectDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipes/:teamId"
        element={
          <ProtectedRoute key="equipe" title="Equipe">
            <TeamDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipes/:teamId/atividades/:activityId"
        element={
          <ProtectedRoute key="atividade" title="Atividade">
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

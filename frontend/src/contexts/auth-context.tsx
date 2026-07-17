import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { api } from '@/lib/api-handler'
import {
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredSession,
} from '@/lib/auth-storage'
import type {
  AuthResponse,
  ChangePasswordInput,
  ChangePasswordPayload,
  LoginCredentials,
  LoginResponse,
  MeResponse,
  User,
} from '@/types/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  pendingPasswordChange: boolean
  pendingUser: User | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  changePassword: (input: ChangePasswordInput) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [isLoading, setIsLoading] = useState(true)
  const [pendingCredentials, setPendingCredentials] = useState<LoginCredentials | null>(null)
  const [pendingUser, setPendingUser] = useState<User | null>(null)

  const clearSession = useCallback(() => {
    clearStoredToken()
    setToken(null)
    setUser(null)
    setPendingCredentials(null)
    setPendingUser(null)
  }, [])

  const applySession = useCallback((accessToken: string, refreshToken: string, nextUser: User) => {
    setStoredSession(accessToken, refreshToken)
    setToken(accessToken)
    setUser(nextUser)
  }, [])

  const restoreSession = useCallback(async () => {
    const storedToken = getStoredToken()
    const storedRefreshToken = getStoredRefreshToken()

    if (!storedToken && !storedRefreshToken) {
      setIsLoading(false)
      return
    }

    if (storedToken) {
      setToken(storedToken)
    }

    try {
      const { user: currentUser } = await api<MeResponse>('/auth/me', {
        toastOnError: false,
      })
      setUser(currentUser)
      setToken(getStoredToken())
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  useEffect(() => {
    const onSessionExpired = () => {
      clearSession()
    }

    window.addEventListener('kairo:session-expired', onSessionExpired)
    return () => {
      window.removeEventListener('kairo:session-expired', onSessionExpired)
    }
  }, [clearSession])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      const response = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })

      if (response.requiresPasswordChange) {
        setPendingCredentials(credentials)
        setPendingUser(response.user)
        return false
      }

      applySession(response.token, response.refreshToken, response.user)
      return true
    },
    [applySession],
  )

  const changePassword = useCallback(
    async ({ newPassword, confirmPassword }: ChangePasswordInput) => {
      if (!pendingCredentials) {
        throw new Error('Sessão de alteração de senha expirada. Faça login novamente.')
      }

      const payload: ChangePasswordPayload = {
        ...pendingCredentials,
        currentPassword: pendingCredentials.password,
        newPassword,
        confirmPassword,
      }

      const {
        token: accessToken,
        refreshToken,
        user: authenticatedUser,
      } = await api<AuthResponse>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setPendingCredentials(null)
      setPendingUser(null)
      applySession(accessToken, refreshToken, authenticatedUser)
    },
    [applySession, pendingCredentials],
  )

  const refreshUser = useCallback(async () => {
    const { user: currentUser } = await api<MeResponse>('/auth/me', {
      toastOnError: false,
    })
    setUser(currentUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        const refreshToken = getStoredRefreshToken()
        await api<null>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
          toastOnSuccess: false,
        })
      }
    } catch {
      // Sessão já pode estar inválida; limpa o estado local mesmo assim.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      pendingPasswordChange: Boolean(pendingCredentials && pendingUser),
      pendingUser,
      login,
      changePassword,
      refreshUser,
      logout,
    }),
    [
      user,
      token,
      isLoading,
      pendingCredentials,
      pendingUser,
      login,
      changePassword,
      refreshUser,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}

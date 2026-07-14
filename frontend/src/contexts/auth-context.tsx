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
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/auth-storage'
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

  const restoreSession = useCallback(async () => {
    const storedToken = getStoredToken()

    if (!storedToken) {
      setIsLoading(false)
      return
    }

    setToken(storedToken)

    try {
      const { user: currentUser } = await api<MeResponse>('/auth/me', {
        toastOnError: false,
      })
      setUser(currentUser)
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })

    if (response.requiresPasswordChange) {
      setPendingCredentials(credentials)
      setPendingUser(response.user)
      return false
    }

    setStoredToken(response.token)
    setToken(response.token)
    setUser(response.user)
    return true
  }, [])

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

      const { token: accessToken, user: authenticatedUser } = await api<AuthResponse>(
        '/auth/change-password',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )

      setPendingCredentials(null)
      setPendingUser(null)
      setStoredToken(accessToken)
      setToken(accessToken)
      setUser(authenticatedUser)
    },
    [pendingCredentials],
  )

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await api<null>('/auth/logout', {
          method: 'POST',
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
      logout,
    }),
    [user, token, isLoading, pendingCredentials, pendingUser, login, changePassword, logout],
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

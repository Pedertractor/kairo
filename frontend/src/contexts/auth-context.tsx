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
import type { AuthResponse, LoginCredentials, MeResponse, User } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    clearStoredToken()
    setToken(null)
    setUser(null)
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

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { token: accessToken, user: authenticatedUser } = await api<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
    )

    setStoredToken(accessToken)
    setToken(accessToken)
    setUser(authenticatedUser)
  }, [])

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
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
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

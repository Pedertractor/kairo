const TOKEN_KEY = 'kairo:token'
const REFRESH_TOKEN_KEY = 'kairo:refreshToken'
const PRODUCTION_KEY = 'kairo:production'

export function isStoredProductionSession(): boolean {
  return sessionStorage.getItem(PRODUCTION_KEY) === 'true'
}

export function getStoredToken(): string | null {
  return isStoredProductionSession() ? sessionStorage.getItem(TOKEN_KEY) : localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getStoredRefreshToken(): string | null {
  return isStoredProductionSession() ? null : localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setStoredRefreshToken(refreshToken: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function setStoredSession(token: string, refreshToken: string, production = false): void {
  clearStoredToken()
  if (production) {
    sessionStorage.setItem(PRODUCTION_KEY, 'true')
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem('kairo:paused-timer-target')
    return
  }
  setStoredToken(token)
  setStoredRefreshToken(refreshToken)
}

export function clearStoredToken(): void {
  if (isStoredProductionSession()) localStorage.removeItem('kairo:paused-timer-target')
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(PRODUCTION_KEY)
  sessionStorage.removeItem('kairo:production-expires-at')
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

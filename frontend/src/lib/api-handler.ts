import { toast } from 'sonner'

import {
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredSession,
} from '@/lib/auth-storage'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const GENERIC_SERVER_ERROR_MESSAGE =
  'Ocorreu um erro inesperado. Tente novamente mais tarde.'

export interface ApiErrorBody {
  mensagem: string
}

export interface ApiSuccessBody<T> {
  dados: T
  mensagem?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type ApiRequestOptions = RequestInit & {
  /** Exibe toast de sucesso quando a resposta incluir `mensagem`. Padrão: `true`. */
  toastOnSuccess?: boolean
  /** Exibe toast de erro automaticamente. Padrão: `true`. */
  toastOnError?: boolean
  /** Evita nova tentativa de refresh nesta requisição. Uso interno. */
  _skipRefresh?: boolean
}

function extractMensagem(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined

  const record = body as Record<string, unknown>
  if (typeof record.mensagem === 'string') return record.mensagem

  return undefined
}

function extractDados<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'dados' in body) {
    return (body as ApiSuccessBody<T>).dados
  }

  return body as T
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function resolveErrorMessage(status: number, body: unknown): string {
  if (status >= 500) {
    return GENERIC_SERVER_ERROR_MESSAGE
  }

  return extractMensagem(body) ?? 'Ocorreu um erro.'
}

function showErrorToast(status: number, body: unknown): string {
  const mensagem = resolveErrorMessage(status, body)
  toast.error(mensagem)
  return mensagem
}

function isFormDataBody(body: BodyInit | null | undefined): boolean {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

async function executeApiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const {
    toastOnError = true,
    toastOnSuccess: _toastOnSuccess,
    _skipRefresh = false,
    ...init
  } = options
  const token = getStoredToken()
  const hasBody =
    init.body !== undefined && init.body !== null && init.body !== ''
  const skipJsonContentType = isFormDataBody(init.body)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(hasBody && !skipJsonContentType
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    const mensagem =
      'Não foi possível contactar o servidor. Verifique a ligação e tente novamente.'
    if (toastOnError) {
      toast.error(mensagem)
    }
    throw new ApiError(0, mensagem)
  }

  const shouldTryRefresh =
    response.status === 401 &&
    !_skipRefresh &&
    !AUTH_PATHS_WITHOUT_REFRESH.has(path) &&
    Boolean(getStoredRefreshToken())

  if (shouldTryRefresh) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return executeApiRequest(path, {
        ...options,
        _skipRefresh: true,
      })
    }
  }

  return response
}

const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/change-password',
])

let refreshInFlight: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      return false
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      const body = await parseBody(response)
      if (!response.ok) {
        clearStoredToken()
        window.dispatchEvent(new Event('kairo:session-expired'))
        return false
      }

      const dados = extractDados<{ token: string; refreshToken: string }>(body)
      if (!dados?.token || !dados?.refreshToken) {
        clearStoredToken()
        window.dispatchEvent(new Event('kairo:session-expired'))
        return false
      }

      setStoredSession(dados.token, dados.refreshToken)
      return true
    } catch {
      clearStoredToken()
      window.dispatchEvent(new Event('kairo:session-expired'))
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/**
 * Processa uma resposta HTTP da API, exibe toasts e retorna os dados.
 * Use `api()` para novas requisições — este handler é o núcleo compartilhado.
 */
export async function handleApiResponse<T>(
  response: Response,
  options: Pick<ApiRequestOptions, 'toastOnSuccess' | 'toastOnError'> = {},
): Promise<T> {
  const { toastOnSuccess = true, toastOnError = true } = options
  const body = await parseBody(response)

  if (!response.ok) {
    const mensagem = toastOnError
      ? showErrorToast(response.status, body)
      : resolveErrorMessage(response.status, body)

    throw new ApiError(response.status, mensagem)
  }

  const mensagem = extractMensagem(body)
  if (toastOnSuccess && mensagem) {
    toast.success(mensagem)
  }

  return extractDados<T>(body)
}

/**
 * Cliente HTTP global do frontend. Todas as chamadas à API devem usar esta função.
 */
export async function api<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { toastOnSuccess, toastOnError = true } = options
  const response = await executeApiRequest(path, options)

  return handleApiResponse<T>(response, { toastOnSuccess, toastOnError })
}

/**
 * Cliente para respostas binárias (ficheiros). Usa a mesma autenticação e refresh do `api()`.
 */
export async function apiBlob(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Blob> {
  const { toastOnError = true } = options
  const response = await executeApiRequest(path, {
    ...options,
    headers: {
      Accept: '*/*',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await parseBody(response)
    const mensagem = toastOnError
      ? showErrorToast(response.status, body)
      : resolveErrorMessage(response.status, body)

    throw new ApiError(response.status, mensagem)
  }

  return response.blob()
}

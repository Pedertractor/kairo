import { toast } from 'sonner'

import { getStoredToken } from '@/lib/auth-storage'

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
  const { toastOnSuccess, toastOnError, ...init } = options
  const token = getStoredToken()
  const hasBody =
    init.body !== undefined && init.body !== null && init.body !== ''

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  return handleApiResponse<T>(response, { toastOnSuccess, toastOnError })
}

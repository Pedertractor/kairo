import { env } from '../config/env.js';

export type ExternalApiRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export class ExternalApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ExternalApiError';
  }
}

function buildUrl(path: string): string {
  if (!env.API_BASE_URL) {
    throw new ExternalApiError(
      0,
      'API_BASE_URL não está configurada no ambiente',
    );
  }

  const base = env.API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function authHeaders(): Record<string, string> {
  return {
    key: env.API_BASE_KEY,
    nameapplication: env.API_BASE_NAME_APPLICATION,
    Accept: 'application/json',
  };
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.mensagem === 'string') return record.mensagem;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.error === 'string') return record.error;
  }

  if (typeof body === 'string' && body.trim()) return body;

  return `Erro na API externa (${status})`;
}

/**
 * Cliente HTTP para a API externa. Todas as chamadas incluem os headers
 * `key` e `nameapplication` definidos em `API_BASE_KEY` e `API_BASE_NAME_APPLICATION`.
 */
export async function externalApiRequest<T>(
  path: string,
  options: ExternalApiRequestOptions = {},
): Promise<T> {
  const { headers, ...init } = options;
  const hasBody =
    init.body !== undefined && init.body !== null && init.body !== '';

  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...authHeaders(),
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  });

  const body = await parseBody(response);

  if (!response.ok) {
    throw new ExternalApiError(
      response.status,
      extractErrorMessage(body, response.status),
      body,
    );
  }

  return body as T;
}

export const externalApi = {
  get<T>(path: string, options?: ExternalApiRequestOptions): Promise<T> {
    return externalApiRequest<T>(path, { ...options, method: 'GET' });
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: ExternalApiRequestOptions,
  ): Promise<T> {
    return externalApiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: ExternalApiRequestOptions,
  ): Promise<T> {
    return externalApiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: ExternalApiRequestOptions,
  ): Promise<T> {
    return externalApiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, options?: ExternalApiRequestOptions): Promise<T> {
    return externalApiRequest<T>(path, { ...options, method: 'DELETE' });
  },
};

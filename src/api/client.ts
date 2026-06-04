/**
 * Resolve API base URL for web, production, and Capacitor builds.
 * - Web dev: `/api` (Vite proxy)
 * - Production same-origin: `/api`
 * - Mobile app: set VITE_API_BASE=https://your-api.com/api at build time
 */
export function getApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return '/api'
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(`${getApiBase()}${normalizedPath}`, { ...options, headers })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(body?.message || 'Request failed', response.status)
  }
  return body as T
}

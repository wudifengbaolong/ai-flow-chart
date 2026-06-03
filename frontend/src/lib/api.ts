const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public detail: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: 'UNKNOWN',
      message: res.statusText,
      detail: {},
    }))
    throw new ApiError(err.error, err.message, err.detail)
  }

  return res.json()
}

export async function requestSSE(
  path: string,
  body: Record<string, unknown>,
  onChunk: (content: string) => void,
  onDone: (puml: string, graph: unknown) => void,
): Promise<void> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: 'UNKNOWN',
      message: res.statusText,
      detail: {},
    }))
    throw new ApiError(err.error, err.message, err.detail)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = JSON.parse(line.slice(6))
      if (data.type === 'chunk') {
        onChunk(data.content)
      } else if (data.type === 'done') {
        onDone(data.puml, data.graph)
      }
    }
  }
}

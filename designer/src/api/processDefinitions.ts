export interface ApiBody<T> {
  code: number
  message: string
  data: T
}

export interface ProcessDefinitionSummary {
  key: string
  name: string
  version: number
}

export interface ProcessModelView extends ProcessDefinitionSummary {
  xml: string
}

const TOKEN_KEY = 'satoken'

function authHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {}
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    headers.satoken = token
  }
  if (json) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function readBody<T>(response: Response): Promise<ApiBody<T>> {
  const body = (await response.json()) as ApiBody<T>
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || 'request failed')
  }
  return body
}

export async function login(username: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = await readBody<{ token: string }>(response)
  localStorage.setItem(TOKEN_KEY, body.data.token)
}

export async function hasSession() {
  const response = await fetch('/api/auth/me', { headers: authHeaders() })
  return response.ok
}

export async function listDefinitions() {
  const response = await fetch('/api/process-definitions', { headers: authHeaders() })
  const body = await readBody<ProcessDefinitionSummary[]>(response)
  return body.data
}

export async function getModel(key: string) {
  const response = await fetch(`/api/process-definitions/${encodeURIComponent(key)}/model`, {
    headers: authHeaders(),
  })
  const body = await readBody<ProcessModelView>(response)
  return body.data
}

export async function deployXml(xml: string) {
  const response = await fetch('/api/process-definitions', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ xml }),
  })
  const body = await readBody<ProcessDefinitionSummary>(response)
  return body.data
}

const API_BASE = 'http://localhost:3001/api'

export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
}

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: string
  content?: string
}

// Projects
export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`)
  const data = await res.json()
  return data.projects
}

export async function createProject(name: string, basePath: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, basePath }),
  })
  const data = await res.json()
  return data.project
}

// Files
export async function listFiles(projectId: string, path = ''): Promise<FileEntry[]> {
  const url = path
    ? `${API_BASE}/projects/${projectId}/files/${path}`
    : `${API_BASE}/projects/${projectId}/files`
  const res = await fetch(url)
  const data = await res.json()
  return data.files
}

export async function readFile(projectId: string, path: string): Promise<FileEntry> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/files/${path}`)
  const data = await res.json()
  return data.file
}

export async function writeFile(projectId: string, path: string, content: string): Promise<void> {
  await fetch(`${API_BASE}/projects/${projectId}/files/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

// Query (Claude)
export async function sendQuery(projectId: string, prompt: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  return res.json()
}

// Streaming query with status updates
export interface StreamEvent {
  type: 'status' | 'result' | 'error' | 'done'
  data: unknown
}

export async function sendQueryStream(
  projectId: string,
  prompt: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events from buffer
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent
          onEvent(event)
        } catch {
          // Invalid JSON, skip
        }
      }
    }
  }
}

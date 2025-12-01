import express from 'express'
import cors from 'cors'
import { readFile, appendFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = join(homedir(), '.gimbal', 'logs')

// Session storage: projectId -> sessionId (for multi-turn conversations)
const projectSessions = new Map<string, string>()

// Log chat transcripts to ~/.gimbal/logs/
async function logChat(projectName: string, prompt: string, messages: unknown[]) {
  try {
    await mkdir(LOGS_DIR, { recursive: true })
    const timestamp = new Date().toISOString()
    const logFile = join(LOGS_DIR, `${projectName}.jsonl`)
    const entry = JSON.stringify({ timestamp, prompt, messages }) + '\n'
    await appendFile(logFile, entry)
  } catch (err) {
    console.error('[Log] Failed to write chat log:', err)
  }
}
import { query } from '@anthropic-ai/claude-agent-sdk'
import { buildSystemPrompt } from './schema.js'
import { listProjects, createProject, getProject, deleteProject } from './projects.js'
import {
  listDirectory,
  readProjectFile,
  writeProjectFile,
  deleteProjectFile,
  createProjectDirectory,
  getFileInfo,
} from './files.js'

// Routes
const ROUTES = {
  HEALTH: '/api/health',
  PROJECTS: '/api/projects',
  PROJECT: '/api/projects/:id',
  QUERY: '/api/projects/:id/query',
  QUERY_STREAM: '/api/projects/:id/query/stream',
  FILES: '/api/projects/:id/files',
  FILE: '/api/projects/:id/files/*',
} as const

// Helper to extract status text from SDK messages for streaming UI
function getStatusFromMessage(message: unknown): string | null {
  const msg = message as { type?: string; message?: { content?: Array<{ type: string; name?: string; input?: unknown }> }; tool_use_result?: string }

  if (msg.type === 'assistant' && msg.message?.content) {
    for (const block of msg.message.content) {
      if (block.type === 'tool_use' && block.name) {
        // Format tool names nicely
        const toolName = block.name
        if (toolName === 'WebSearch') return 'Searching the web...'
        if (toolName === 'WebFetch') return 'Fetching web page...'
        if (toolName === 'Read') return 'Reading file...'
        if (toolName === 'Write') return 'Writing file...'
        if (toolName === 'Bash') return 'Running command...'
        if (toolName.startsWith('mcp__filesystem__')) {
          const action = toolName.replace('mcp__filesystem__', '')
          if (action.includes('read')) return 'Reading file...'
          if (action.includes('write')) return 'Writing file...'
          if (action.includes('list')) return 'Listing directory...'
          if (action.includes('create')) return 'Creating directory...'
          return `File operation: ${action}...`
        }
        if (toolName.startsWith('mcp__fetch__')) return 'Fetching data...'
        return `Using ${toolName}...`
      }
    }
  }
  return null
}

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

app.get(ROUTES.HEALTH, (_req, res) => {
  res.json({ status: 'ok' })
})

app.get(ROUTES.PROJECTS, async (_req, res) => {
  const projects = await listProjects()
  res.json({ projects })
})

app.post(ROUTES.PROJECTS, async (req, res) => {
  const { name, basePath } = req.body

  if (!name || !basePath) {
    res.status(400).json({ error: 'name and basePath are required' })
    return
  }

  const project = await createProject(name, basePath)
  res.json({ project })
})

app.get(ROUTES.PROJECT, async (req, res) => {
  const project = await getProject(req.params.id)
  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }
  res.json({ project })
})

app.delete(ROUTES.PROJECT, async (req, res) => {
  const deleted = await deleteProject(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'project not found' })
    return
  }
  res.json({ success: true })
})

// File routes - direct file operations without Claude

// GET /api/projects/:id/files - list root directory
app.get(ROUTES.FILES, async (req, res) => {
  const project = await getProject(req.params.id)
  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }

  try {
    const files = await listDirectory(project.path)
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/projects/:id/files/* - read file or list directory
app.get(ROUTES.FILE, async (req, res) => {
  const project = await getProject(req.params.id)
  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }

  const relativePath = req.params[0] || ''

  try {
    const info = await getFileInfo(project.path, relativePath)

    if (info.type === 'directory') {
      const files = await listDirectory(project.path, relativePath)
      res.json({ files })
    } else {
      const content = await readProjectFile(project.path, relativePath)
      res.json({ file: { ...info, content } })
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'file not found' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// POST /api/projects/:id/files/* - write file
app.post(ROUTES.FILE, async (req, res) => {
  const project = await getProject(req.params.id)
  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }

  const relativePath = req.params[0] || ''
  const { content } = req.body

  if (content === undefined) {
    res.status(400).json({ error: 'content is required' })
    return
  }

  try {
    await writeProjectFile(project.path, relativePath, content)
    res.json({ success: true, path: relativePath })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/projects/:id/files/* - create directory
app.put(ROUTES.FILE, async (req, res) => {
  const project = await getProject(req.params.id)
  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }

  const relativePath = req.params[0] || ''

  try {
    await createProjectDirectory(project.path, relativePath)
    res.json({ success: true, path: relativePath })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/projects/:id/files/* - delete file or empty directory
app.delete(ROUTES.FILE, async (req, res) => {
  const project = await getProject(req.params.id)
  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }

  const relativePath = req.params[0] || ''

  try {
    await deleteProjectFile(project.path, relativePath)
    res.json({ success: true })
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'file not found' })
    } else if (error.code === 'ENOTEMPTY') {
      res.status(400).json({ error: 'directory not empty' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

app.post(ROUTES.QUERY, async (req, res) => {
  const { prompt } = req.body
  const project = await getProject(req.params.id)

  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' })
    return
  }

  // Load project's CLAUDE.md if it exists
  let claudeMd: string | undefined
  try {
    claudeMd = await readFile(join(project.path, 'CLAUDE.md'), 'utf-8')
  } catch {
    // No CLAUDE.md, that's fine
  }

  const systemPrompt = buildSystemPrompt(project.id, project.name, project.path, claudeMd)
  const messages: unknown[] = []

  for await (const message of query({
    prompt,
    options: {
      cwd: project.path,
      systemPrompt,
      permissionMode: 'bypassPermissions',
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', project.path],
        },
        fetch: {
          command: 'node',
          args: [join(__dirname, '../../mcp-fetch/dist/index.js')],
        },
      },
      // No allowedTools restriction - Claude has access to all tools
    },
  })) {
    messages.push(message)
  }

  res.json({ messages })
})

// Streaming query endpoint with SSE for real-time status updates
// Uses SDK session resumption for proper multi-turn conversations
app.post(ROUTES.QUERY_STREAM, async (req, res) => {
  const { prompt } = req.body as { prompt: string }
  const project = await getProject(req.params.id)

  if (!project) {
    res.status(404).json({ error: 'project not found' })
    return
  }

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' })
    return
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Helper to send SSE events
  const sendEvent = (type: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
  }

  // Load project's CLAUDE.md if it exists
  let claudeMd: string | undefined
  try {
    claudeMd = await readFile(join(project.path, 'CLAUDE.md'), 'utf-8')
  } catch {
    // No CLAUDE.md, that's fine
  }

  const systemPrompt = buildSystemPrompt(project.id, project.name, project.path, claudeMd)
  const messages: unknown[] = []

  // Check for existing session to resume
  const existingSessionId = projectSessions.get(project.id)
  console.log('[Query] Project:', project.id, 'Session:', existingSessionId || 'new')

  try {
    for await (const message of query({
      prompt,
      options: {
        cwd: project.path,
        systemPrompt,
        permissionMode: 'bypassPermissions',
        // Resume existing session if available (SDK maintains conversation history)
        resume: existingSessionId,
        mcpServers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', project.path],
          },
          fetch: {
            command: 'node',
            args: [join(__dirname, '../../mcp-fetch/dist/index.js')],
          },
        },
      },
    })) {
      messages.push(message)

      // Extract session_id from result message and store it
      const msg = message as { type?: string; session_id?: string }
      if (msg.type === 'result' && msg.session_id) {
        projectSessions.set(project.id, msg.session_id)
        console.log('[Query] Stored session:', msg.session_id)
      }

      // Send status updates for tool use
      const status = getStatusFromMessage(message)
      if (status) {
        sendEvent('status', status)
      }
    }

    // Log the chat transcript
    await logChat(project.name, prompt, messages)

    // Send final result
    sendEvent('result', { messages })
    sendEvent('done', null)
  } catch (err) {
    sendEvent('error', { message: String(err) })
  }

  res.end()
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

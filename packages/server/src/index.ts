import express from 'express'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { buildSystemPrompt } from './schema.js'
import { listProjects, createProject, getProject, deleteProject } from './projects.js'

// Routes
const ROUTES = {
  HEALTH: '/api/health',
  PROJECTS: '/api/projects',
  PROJECT: '/api/projects/:id',
  QUERY: '/api/projects/:id/query',
} as const

const app = express()
const port = 3001

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
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', project.path],
        },
      },
      allowedTools: ['mcp__filesystem__read_file', 'mcp__filesystem__list_directory'],
    },
  })) {
    messages.push(message)
  }

  res.json({ messages })
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

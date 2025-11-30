import express from 'express'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { SYSTEM_PROMPT } from './schema.js'

const app = express()
const port = 3001

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/query', async (req, res) => {
  const { prompt } = req.body

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' })
    return
  }

  const messages: unknown[] = []

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/will/code/gimbal'],
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

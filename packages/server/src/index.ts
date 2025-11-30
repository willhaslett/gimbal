import express from 'express'
import { query } from '@anthropic-ai/claude-agent-sdk'

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

  for await (const message of query({ prompt })) {
    messages.push(message)
  }

  res.json({ messages })
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

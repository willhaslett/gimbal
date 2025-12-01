import { useState } from 'react'
import Markdown from 'react-markdown'
import { sendQueryStream, StreamEvent } from '../api'

// Match the schema from server/src/schema.ts
type GimbalResponseItem =
  | { type: 'text'; content: string }
  | { type: 'file_created'; path: string; description?: string }
  | { type: 'file_read'; path: string; content: string }
  | { type: 'file_list'; path: string; entries: Array<{ name: string; isDirectory: boolean }> }
  | { type: 'error'; message: string }

interface Message {
  role: 'user' | 'assistant'
  content: string
  items?: GimbalResponseItem[]
}

interface Props {
  projectId: string
  onFilesChanged: () => void
}

function ResponseItem({ item }: { item: GimbalResponseItem }) {
  switch (item.type) {
    case 'text':
      return (
        <div className="markdown-content">
          <Markdown>{item.content}</Markdown>
        </div>
      )

    case 'file_created':
      return (
        <div style={{ padding: '0.5rem', background: '#e8f5e9', borderRadius: '0.25rem', marginBottom: '0.5rem' }}>
          <span style={{ marginRight: '0.5rem' }}>📄</span>
          <strong>Created:</strong> {item.path}
          {item.description && <span style={{ color: '#666', marginLeft: '0.5rem' }}>— {item.description}</span>}
        </div>
      )

    case 'file_read':
      return (
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>📖 {item.path}</div>
          <pre style={{ background: '#f5f5f5', padding: '0.5rem', borderRadius: '0.25rem', overflow: 'auto', fontSize: '0.8rem', maxHeight: '200px' }}>
            {item.content}
          </pre>
        </div>
      )

    case 'file_list':
      return (
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>📁 {item.path}</div>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {item.entries.map((entry, i) => (
              <li key={i}>
                {entry.isDirectory ? '📁' : '📄'} {entry.name}
              </li>
            ))}
          </ul>
        </div>
      )

    case 'error':
      return (
        <div style={{ padding: '0.5rem', background: '#ffebee', borderRadius: '0.25rem', color: '#c62828' }}>
          <strong>Error:</strong> {item.message}
        </div>
      )

    default:
      return null
  }
}

// Validate individual response items
function validateItem(item: unknown, index: number): GimbalResponseItem | null {
  if (!item || typeof item !== 'object') {
    console.error(`[GimbalResponse] Item ${index}: not an object`, item)
    return null
  }

  const obj = item as Record<string, unknown>
  const type = obj.type

  switch (type) {
    case 'text':
      if (typeof obj.content !== 'string') {
        console.error(`[GimbalResponse] Item ${index}: text missing content`, obj)
        return null
      }
      return { type: 'text', content: obj.content }

    case 'file_created':
      if (typeof obj.path !== 'string') {
        console.error(`[GimbalResponse] Item ${index}: file_created missing path`, obj)
        return null
      }
      return {
        type: 'file_created',
        path: obj.path,
        description: typeof obj.description === 'string' ? obj.description : undefined,
      }

    case 'file_read':
      if (typeof obj.path !== 'string' || typeof obj.content !== 'string') {
        console.error(`[GimbalResponse] Item ${index}: file_read missing path/content`, obj)
        return null
      }
      return { type: 'file_read', path: obj.path, content: obj.content }

    case 'file_list':
      if (typeof obj.path !== 'string' || !Array.isArray(obj.entries)) {
        console.error(`[GimbalResponse] Item ${index}: file_list missing path/entries`, obj)
        return null
      }
      return {
        type: 'file_list',
        path: obj.path,
        entries: obj.entries as Array<{ name: string; isDirectory: boolean }>,
      }

    case 'error':
      if (typeof obj.message !== 'string') {
        console.error(`[GimbalResponse] Item ${index}: error missing message`, obj)
        return null
      }
      return { type: 'error', message: obj.message }

    default:
      console.error(`[GimbalResponse] Item ${index}: unknown type "${type}"`, obj)
      return null
  }
}

// Parse and validate GimbalResponse from SDK result
// Strip markdown code block fences if present
function stripCodeBlock(str: string): string {
  const trimmed = str.trim()
  // Match ```json or ``` at start, ``` at end
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i)
  return match ? match[1].trim() : trimmed
}

function parseGimbalResponse(rawResult: unknown): GimbalResponseItem[] | null {
  try {
    let parsed: unknown = rawResult

    // If string, strip code blocks and parse as JSON
    if (typeof rawResult === 'string') {
      const jsonStr = stripCodeBlock(rawResult)
      if (!jsonStr) return null
      parsed = JSON.parse(jsonStr)
    }

    // Validate top-level structure
    if (!parsed || typeof parsed !== 'object') {
      console.error('[GimbalResponse] Not an object:', typeof parsed)
      return null
    }

    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.items)) {
      console.error('[GimbalResponse] Missing items array:', Object.keys(obj))
      return null
    }

    // Validate each item
    const validItems: GimbalResponseItem[] = []
    for (let i = 0; i < obj.items.length; i++) {
      const validItem = validateItem(obj.items[i], i)
      if (validItem) {
        validItems.push(validItem)
      }
    }

    if (validItems.length === 0) {
      console.error('[GimbalResponse] No valid items found')
      return null
    }

    return validItems
  } catch (e) {
    console.error('[GimbalResponse] Parse error:', e, '\nRaw:', rawResult)
    return null
  }
}

export function ChatPanel({ projectId, onFilesChanged }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // Server maintains session state - no need for client-side history management

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setStatus('Thinking...')

    try {
      await sendQueryStream(projectId, userMessage, (event: StreamEvent) => {
        if (event.type === 'status') {
          setStatus(event.data as string)
        } else if (event.type === 'result') {
          // Log full SDK response for debugging
          console.log('[SDK Result]', JSON.stringify(event.data, null, 2))

          const data = event.data as { messages?: Array<{ type: string; result?: unknown }> }
          const resultMessage = data.messages?.find((m) => m.type === 'result')
          const rawResult = resultMessage?.result

          // Log extraction
          console.log('[SDK Result] Extracted:', typeof rawResult, rawResult)

          const items = parseGimbalResponse(rawResult)

          if (items) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: '', items },
            ])
            // Always refresh - Claude may have modified files
            onFilesChanged()
          } else {
            // Fallback: show raw result
            const fallback = typeof rawResult === 'string'
              ? rawResult
              : JSON.stringify(event.data, null, 2)
            console.warn('[SDK Result] Fallback display, raw:', fallback)
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: fallback },
            ])
            // Still refresh - Claude may have modified files
            onFilesChanged()
          }
        } else if (event.type === 'error') {
          const errorData = event.data as { message: string }
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Error: ${errorData.message}` },
          ])
        }
      })
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err}` },
      ])
    } finally {
      setLoading(false)
      setStatus(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {messages.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Ask Claude to help with your project...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: msg.role === 'user' ? '#e3f2fd' : '#f9f9f9',
              maxWidth: msg.role === 'user' ? '80%' : '100%',
              marginLeft: msg.role === 'user' ? 'auto' : '0',
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
              {msg.role === 'user' ? 'You' : 'Claude'}
            </div>
            {msg.items ? (
              <div>
                {msg.items.map((item, j) => (
                  <ResponseItem key={j} item={item} />
                ))}
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                {msg.content}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{
            color: '#666',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              background: '#2196f3',
              borderRadius: '50%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            {status || 'Thinking...'}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          padding: '1rem',
          borderTop: '1px solid #ddd',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Claude..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #ddd',
            borderRadius: '0.25rem',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}

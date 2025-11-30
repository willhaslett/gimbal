import { useState } from 'react'

function App() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setResponse(null)

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setResponse(data)
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Gimbal</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt..."
          style={{ width: '400px', padding: '0.5rem', fontSize: '1rem' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem' }}
        >
          {loading ? 'Loading...' : 'Send'}
        </button>
      </form>

      {response && (
        <pre style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f5f5f5',
          overflow: 'auto',
          maxHeight: '70vh',
          fontSize: '0.875rem',
        }}>
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default App

import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState<string>('loading...')

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div>
      <h1>Gimbal</h1>
      <p>Server status: {status}</p>
    </div>
  )
}

export default App

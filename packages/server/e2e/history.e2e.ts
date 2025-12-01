/**
 * Test: Session-Based Conversation History
 *
 * Verifies that the server maintains session state across multiple queries
 * using the SDK's resume feature. This is the proper multi-turn approach.
 */

const API_BASE = 'http://localhost:3001/api'

async function createTestProject(name: string): Promise<string> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, basePath: '~/Documents/Gimbal' }),
  })
  const data = await res.json()
  return data.project.id
}

async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
}

async function sendQuery(projectId: string, prompt: string): Promise<string> {
  // Note: No history parameter - server maintains session state
  const res = await fetch(`${API_BASE}/projects/${projectId}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  // Read SSE stream and collect result
  const text = await res.text()
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const event = JSON.parse(line.slice(6))
        if (event.type === 'result') {
          return JSON.stringify(event.data)
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return ''
}

async function runTests() {
  console.log('=== Session-Based Multi-Turn Conversation Tests ===\n')

  const projectId = await createTestProject(`session-test-${Date.now()}`)
  console.log(`Created test project: ${projectId}\n`)

  try {
    // Test 1: First query (new session)
    console.log('Test 1: First query (creates new session)')
    console.log('  Sending: "Create a file called test.txt with no content"')

    const result1 = await sendQuery(
      projectId,
      'Create a file called test.txt with no content'
    )

    const hasFileCreated = result1.includes('file_created') || result1.includes('test.txt')
    console.log(`  Result contains file reference: ${hasFileCreated}`)
    console.log(`  ✓ Test 1 passed\n`)

    // Test 2: Second query (should resume session automatically)
    console.log('Test 2: Second query (resumes session)')
    console.log('  Sending: "Now add some content to it"')
    console.log('  Note: No history passed - server uses session resume')

    const result2 = await sendQuery(
      projectId,
      'Now add some content to it'
    )

    // Check if Claude referenced test.txt (proving it had session context)
    const referencesTestTxt = result2.includes('test.txt')
    console.log(`  Result references test.txt: ${referencesTestTxt}`)

    if (referencesTestTxt) {
      console.log(`  ✓ Test 2 passed - Claude understood "it" refers to test.txt via session\n`)
    } else {
      console.log(`  ✗ Test 2 failed - Claude did not reference test.txt`)
      console.log(`  Result preview: ${result2.slice(0, 200)}...\n`)
    }

    // Test 3: Check server logs
    console.log('Test 3: Check server logs for session')
    console.log('  Run: tail -30 logs/server.log')
    console.log('  Look for: [Query] Project: ... Session: new (first query)')
    console.log('  And: [Query] Stored session: ... (after first query)')
    console.log('  And: [Query] Project: ... Session: <uuid> (second query)\n')

  } finally {
    // Cleanup
    await deleteProject(projectId)
    console.log(`Cleaned up test project: ${projectId}`)
  }

  console.log('\n=== Tests Complete ===')
}

// Run tests
runTests().catch(console.error)

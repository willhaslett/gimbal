import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Claude Agent SDK
const mockQuery = vi.fn()
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: (params: unknown) => mockQuery(params),
}))

// Import after mocking
import { ClaudeProvider, claudeProvider, getProvider } from './index.js'
import type { QueryParams } from './types.js'

describe('providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ClaudeProvider', () => {
    it('has correct id and name', () => {
      const provider = new ClaudeProvider()
      expect(provider.id).toBe('claude')
      expect(provider.name).toBe('Claude')
    })

    it('collects messages from SDK query', async () => {
      // Mock an async generator that yields messages
      const mockMessages = [
        { type: 'assistant', content: 'Hello' },
        { type: 'tool_use', name: 'Read' },
        { type: 'result', data: 'Final result' },
      ]

      mockQuery.mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg
        }
      })

      const provider = new ClaudeProvider()
      const params: QueryParams = {
        prompt: 'test prompt',
        projectPath: '/test/path',
        systemPrompt: 'You are helpful',
      }

      const result = await provider.query(params)

      expect(result.messages).toHaveLength(3)
      expect(result.messages[0]).toEqual({ type: 'assistant', content: 'Hello' })
      expect(result.messages[2]).toEqual({ type: 'result', data: 'Final result' })
    })

    it('calls onMessage callback for each message', async () => {
      const mockMessages = [
        { type: 'assistant', content: 'Hello' },
        { type: 'result', data: 'Done' },
      ]

      mockQuery.mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg
        }
      })

      const provider = new ClaudeProvider()
      const onMessage = vi.fn()

      await provider.query(
        {
          prompt: 'test',
          projectPath: '/test',
          systemPrompt: 'test',
        },
        onMessage
      )

      expect(onMessage).toHaveBeenCalledTimes(2)
      expect(onMessage).toHaveBeenNthCalledWith(1, { type: 'assistant', content: 'Hello' })
      expect(onMessage).toHaveBeenNthCalledWith(2, { type: 'result', data: 'Done' })
    })

    it('extracts session ID from result message', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'assistant', content: 'Hello' }
        yield { type: 'result', session_id: 'session-123', data: 'Done' }
      })

      const provider = new ClaudeProvider()
      const result = await provider.query({
        prompt: 'test',
        projectPath: '/test',
        systemPrompt: 'test',
      })

      expect(result.sessionId).toBe('session-123')
    })

    it('passes session ID for resume', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', data: 'Done' }
      })

      const provider = new ClaudeProvider()
      await provider.query({
        prompt: 'follow up',
        projectPath: '/test',
        systemPrompt: 'test',
        sessionId: 'existing-session',
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'follow up',
          options: expect.objectContaining({
            resume: 'existing-session',
          }),
        })
      )
    })

    it('configures MCP servers correctly', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', data: 'Done' }
      })

      const provider = new ClaudeProvider()
      await provider.query({
        prompt: 'test',
        projectPath: '/my/project',
        systemPrompt: 'test',
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            cwd: '/my/project',
            permissionMode: 'bypassPermissions',
            mcpServers: expect.objectContaining({
              filesystem: expect.objectContaining({
                command: 'node',
                args: expect.arrayContaining(['/my/project']),
              }),
              fetch: expect.objectContaining({
                command: 'node',
              }),
            }),
          }),
        })
      )
    })
  })

  describe('claudeProvider', () => {
    it('is a ClaudeProvider instance', () => {
      expect(claudeProvider).toBeInstanceOf(ClaudeProvider)
    })
  })

  describe('getProvider', () => {
    it('returns claude provider by default', () => {
      const provider = getProvider()
      expect(provider).toBe(claudeProvider)
    })

    it('returns claude provider regardless of providerId (for now)', () => {
      const provider = getProvider('some-other-provider')
      expect(provider).toBe(claudeProvider)
    })
  })
})

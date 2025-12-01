/**
 * Claude AI Provider
 *
 * Wraps the Claude Agent SDK for use with Gimbal.
 */

import { query } from '@anthropic-ai/claude-agent-sdk'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import type { AIProvider, QueryParams, QueryResult } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Resolve MCP filesystem server path once at startup
const MCP_FILESYSTEM_PATH = require.resolve(
  '@modelcontextprotocol/server-filesystem/dist/index.js'
)

export class ClaudeProvider implements AIProvider {
  readonly id = 'claude'
  readonly name = 'Claude'

  async query(
    params: QueryParams,
    onMessage?: (message: unknown) => void
  ): Promise<QueryResult> {
    const { prompt, projectPath, systemPrompt, sessionId } = params
    const messages: unknown[] = []
    let newSessionId: string | undefined

    for await (const message of query({
      prompt,
      options: {
        cwd: projectPath,
        systemPrompt,
        permissionMode: 'bypassPermissions',
        resume: sessionId,
        mcpServers: {
          filesystem: {
            command: 'node',
            args: [MCP_FILESYSTEM_PATH, projectPath],
          },
          fetch: {
            command: 'node',
            args: [join(__dirname, '../../../mcp-fetch/dist/index.js')],
          },
        },
      },
    })) {
      messages.push(message)
      onMessage?.(message)

      // Extract session ID from result message
      const msg = message as { type?: string; session_id?: string }
      if (msg.type === 'result' && msg.session_id) {
        newSessionId = msg.session_id
      }
    }

    return {
      messages,
      sessionId: newSessionId,
    }
  }
}

// Default instance
export const claudeProvider = new ClaudeProvider()

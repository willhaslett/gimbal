#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'gimbal-fetch',
  version: '0.0.1',
})

server.tool(
  'fetch',
  { url: z.string().url() },
  async ({ url }) => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return {
          content: [{ type: 'text', text: `HTTP ${response.status}: ${response.statusText}` }],
          isError: true,
        }
      }
      const text = await response.text()
      return {
        content: [{ type: 'text', text }],
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Fetch error: ${error}` }],
        isError: true,
      }
    }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)

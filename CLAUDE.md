# Gimbal

A GUI wrapper for Claude Code, aimed at semi-technical users doing work that produces digital artifacts.

## Concept

- **Project-centric**: Unlimited projects, each a container where artifacts accumulate over time
- **Structured responses only**: Claude returns JSON conforming to our domain schema; Gimbal renders it
- **Two UI paths**: Direct controls for fast operations (file tree), chat for Claude-powered tasks
- **Stack**: TypeScript/React frontend, Node backend, Claude Agent SDK

## Development

```bash
cd ~/code/gimbal
pnpm install
pnpm --filter @gimbal/server dev   # Server on port 3001
pnpm --filter @gimbal/client dev   # Client on port 5173
```

## Project Structure

```
gimbal/
├── packages/
│   ├── client/          # React frontend (Vite)
│   ├── server/          # Node backend (Express)
│   │   └── src/
│   │       ├── index.ts      # Express routes
│   │       ├── projects.ts   # Project CRUD, stored in ~/.gimbal/
│   │       ├── schema.ts     # Response types, system prompt builder
│   │       └── types.ts      # Project interface
│   └── mcp-fetch/       # Custom MCP server for web fetching
│       └── src/
│           └── index.ts      # Simple fetch tool
├── ARCHITECTURE.md
└── CLAUDE.md
```

## API

```
GET  /api/health
GET  /api/projects
POST /api/projects          { name, basePath }
GET  /api/projects/:id
DELETE /api/projects/:id
POST /api/projects/:id/query  { prompt }
```

## Current Status

**Working:**
- Project CRUD (stored in `~/.gimbal/projects.json`)
- Project directory template: CLAUDE.md, data/, scripts/, output/
- Query endpoint calls Claude Agent SDK with project-scoped MCP servers
- MCP tools: filesystem (read/write/list/create) + fetch (HTTP GET)
- Dynamic system prompt with project context and path
- Sessions are stateless (each query is independent, no conversation memory)
- Validated: fetch Census API data and save as CSV in project

**Known issues:**
- Claude returns JSON wrapped in markdown fences (needs parsing)
- macOS `/tmp` vs `/private/tmp` causes extra MCP round-trip

## Open Questions

- Conversation history management within projects

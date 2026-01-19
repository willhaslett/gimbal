# Gimbal

Get things done with AI.

## Target Customer

**Primary: SMBs and individuals who haven't adopted AI yet**

People curious about AI but haven't crossed the adoption threshold. They don't have Anthropic or OpenAI accounts. Existing options feel too technical (Claude Code, Cursor) or require committing to $20/mo before knowing if it's useful.

Gimbal offers:
- **No setup friction** — no "go get an API key first"
- **Free tier to try** — lower the barrier to experiencing AI for real work
- **One opinionated thing done well** — project workspace + AI collaborator
- **Simple enough** — doesn't scare off non-technical users

**Secondary: Technical users who want something lightweight**

Coders who don't need a full AI IDE. The project *is* the filesystem—open it in VS Code alongside Gimbal if you want.

**Design principle: Simple defaults, power underneath**

## Concept

- **Project-centric**: Unlimited projects, each a container where artifacts accumulate
- **Structured responses**: Claude returns JSON conforming to our domain schema; Gimbal renders it
- **Two UI paths**: Direct controls for fast operations (file tree), chat for Claude-powered tasks
- **Stack**: TypeScript/React frontend, Node backend, Claude Agent SDK

## Development

```bash
cd ~/code/gimbal
pnpm install
pnpm --filter @gimbal/server dev   # Server on port 3001
pnpm --filter @gimbal/client dev   # Client on port 5173
```

## Setup for New Machine

Prerequisites: Node.js 18+, pnpm

```bash
# 1. Clone and install
git clone <repo-url> ~/code/gimbal
cd ~/code/gimbal
pnpm install

# 2. Set API key (add to ~/.zshrc or equivalent)
export ANTHROPIC_API_KEY="sk-ant-..."

# 3. Run
pnpm --filter @gimbal/server dev   # Terminal 1
pnpm --filter @gimbal/client dev   # Terminal 2
# Open http://localhost:5173
```

Projects are created in `~/Documents/Gimbal/` by default.

## Project Structure

```
gimbal/
├── packages/
│   ├── client/          # React frontend (Vite)
│   │   └── src/
│   │       ├── api.ts           # API client (REST + SSE streaming)
│   │       ├── App.tsx          # Main layout (sidebar + chat)
│   │       ├── index.css        # Global styles + markdown
│   │       └── components/
│   │           ├── ProjectSelector.tsx  # Project dropdown + create
│   │           ├── FileTree.tsx         # Expandable file browser
│   │           ├── FileViewer.tsx       # Modal with markdown preview
│   │           └── ChatPanel.tsx        # Chat UI + response rendering
│   ├── server/          # Node backend (Express)
│   │   └── src/
│   │       ├── index.ts      # Express routes (REST + SSE)
│   │       ├── projects.ts   # Project CRUD, stored in ~/.gimbal/
│   │       ├── files.ts      # File operations with path security
│   │       ├── schema.ts     # Response types, system prompt builder
│   │       └── types.ts      # Project interface
│   └── mcp-fetch/       # Custom MCP server for web fetching
│       └── src/
│           └── index.ts      # Simple fetch tool
├── infra/               # AWS CDK infrastructure
├── specs/               # Design specs (auto-loaded by /gimbal)
├── doc_archive/         # Historical discussions (load on request)
└── CLAUDE.md
```

## API

**Projects:**
```
GET    /api/health
GET    /api/projects
POST   /api/projects              { name, basePath }
GET    /api/projects/:id
DELETE /api/projects/:id
```

**Files (direct, no Claude):**
```
GET    /api/projects/:id/files         # List root directory
GET    /api/projects/:id/files/*       # Read file or list directory
POST   /api/projects/:id/files/*       # Write file { content }
PUT    /api/projects/:id/files/*       # Create directory
DELETE /api/projects/:id/files/*       # Delete file/empty directory
```

**Chat History:**
```
GET    /api/projects/:id/history       # Get chat history for UI display
```

**Query (Claude-powered):**
```
POST   /api/projects/:id/query         # Batch response { prompt }
POST   /api/projects/:id/query/stream  # SSE streaming { prompt }
```

## Response Schema

Claude returns `GimbalResponse` JSON:
```typescript
interface GimbalResponse {
  items: GimbalResponseItem[]
}

type GimbalResponseItem =
  | { type: 'text'; content: string }                    // Markdown text
  | { type: 'file_created'; path: string; description?: string }
  | { type: 'file_read'; path: string; content: string }
  | { type: 'file_list'; path: string; entries: Array<{ name: string; isDirectory: boolean }> }
  | { type: 'error'; message: string }
```

## Testing

Unit tests with vitest:

```bash
cd packages/server
pnpm test        # Run once
pnpm test:watch  # Watch mode
```

Tests cover: `schema.ts`, `files.ts`, `projects.ts`, `providers/`

Integration tests in `e2e/` directory (excluded from default run).

Pre-commit hook runs tests automatically.

## Documentation

- **specs/** — Active design specs (loaded by `/gimbal` command)
- **doc_archive/** — Historical discussions, not auto-loaded

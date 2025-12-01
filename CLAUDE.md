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
├── ARCHITECTURE.md
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

## Milestones

### M1: Backend Foundation (Done)
- Project CRUD with persistent storage (`~/.gimbal/projects.json`)
- Claude Agent SDK integration with `permissionMode: 'bypassPermissions'`
- MCP servers: filesystem (scoped to project) + fetch (HTTP GET)
- Dynamic system prompt with project context

### M2: React UI (Done)
- Project selector with create form
- Expandable file tree with click-to-view
- File viewer modal with markdown preview (react-markdown)
- Chat panel with message history

### M3: File API (Done)
- Direct file operations (read/write/list/create/delete)
- Path traversal protection (`securePath()`)
- Decoupled from Claude (fast, no AI latency)

### M4: Streaming & Instrumentation (Done)
- SSE streaming endpoint for real-time status
- Dynamic status messages ("Searching the web...", "Writing file...")
- Response schema validation with console instrumentation
- Graceful fallback when parsing fails

### M5: Session-Based Conversations (Done)
- Server maintains `Map<projectId, sessionId>` for multi-turn conversations
- Uses SDK's `resume` option to continue sessions (proper Claude API format)
- Client simplified: no history management, server handles it
- Enables back-references like "add content to it" that reference earlier context
- Sessions persist in memory per server process (reset on restart)

## Current Status

**Working:**
- Full project lifecycle (create, select, delete)
- File browsing and viewing with markdown preview
- Claude chat with streaming status updates
- Web search and file downloads (Census data validated)
- Schema validation with detailed error logging
- Multi-turn conversations with session resumption

**Known Issues:**
- Response rendering sometimes shows raw JSON (instrumentation added to diagnose)
- macOS `/tmp` vs `/private/tmp` causes extra MCP round-trip
- Sessions reset when server restarts (in-memory storage)

## Next Steps

- [x] Debug response extraction path using console logs
- [ ] User testing with Sara (target user)
- [ ] Persistent session storage (survive server restarts)
- [ ] Error recovery UX (retry, clear)

## Cloud Architecture (2024-11-30)

Target deployment stack (AWS):

```
CloudFront → S3 (React app)
     ↓
API Gateway → Fargate (Node server)
     ↓
S3 (projects) + DynamoDB (metadata)
```

**Components:**
- **Fargate**: Node server container, handles Claude SDK calls and script execution
- **S3**: Project file storage (replaces local filesystem)
- **DynamoDB**: Project/user metadata
- **CloudFront + S3**: Static React frontend
- **Cognito**: User auth (links users to projects)

**Script execution isolation** (future): Currently same-container with sandboxing; may move to per-execution Fargate tasks or Lambda for stronger isolation when needed.

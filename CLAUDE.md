# Gimbal

Get things done with AI.

## Target Customer (2024-11-30)

**Primary: SMBs and individuals who haven't adopted AI yet**

These people are curious about AI but haven't crossed the adoption threshold. They don't have Anthropic or OpenAI accounts. They've heard AI can help with their work but the existing options feel either too technical (Claude Code, Cursor) or require committing to a $20/mo subscription before they even know if it's useful (Claude Pro).

Gimbal offers:
- **No setup friction** — no "go get an API key first"
- **Free tier to try** — lower the barrier to actually experiencing AI for real work
- **One opinionated thing done well** — project workspace + AI collaborator
- **Simple enough** — doesn't scare off non-technical users

**AI Provider Strategy:**

Two modes, designed for extensibility:

1. **Gimbal-provided AI** (default) — We provide the AI, user pays us. No setup required. This is the primary mode for the target customer.

2. **Bring-your-own-model** (future) — User connects their own AI account. Starts with Claude (Max subscription or API key), could expand to OpenAI, etc. Appeals to power users and cost-conscious users at scale.

Build the Gimbal-provided version first. Design with provider abstraction in mind so BYOM is additive, not a rewrite.

**Secondary: Technical users who want something lightweight**

Coders who don't need a full AI IDE, just a clean way to manage a task with AI assistance. The project *is* the filesystem — open it in VS Code alongside Gimbal if you want. `scripts/` is right there. Power is available but not mandatory.

**Design principle: Simple defaults, power underneath**

- **Surface:** Clean, opinionated, no decisions required. "Here's your project, talk to the AI."
- **Depth:** If you want to poke around, it's just a folder. See what the AI made, edit it, run scripts yourself, extend it.

The same product serves both audiences because complexity is opt-in.

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

### M6: Dark Mode & UI Polish (Done)
- CSS custom properties for theming with `prefers-color-scheme` media query
- Automatic light/dark mode based on system preference
- lucide-react icons for file tree (File, Folder, FolderOpen, ChevronRight/Down)
- Unified tree component with proper indentation
- Structured logging with pino + pino-pretty
- Chat history persistence (`~/.gimbal/history/{projectId}.jsonl`)
- History restored on page load via `/api/projects/:id/history` endpoint
- Fixed JSON parsing for responses with nested code blocks

## Current Status

**Working:**
- Full project lifecycle (create, select, delete)
- File browsing and viewing with markdown preview
- Claude chat with streaming status updates
- Web search and file downloads (Census data validated)
- Schema validation with detailed error logging
- Multi-turn conversations with session resumption
- Dark mode (follows system preference)
- Chat history persists across page refreshes

**Known Issues:**
- macOS `/tmp` vs `/private/tmp` causes extra MCP round-trip
- SDK sessions reset when server restarts (in-memory storage)

## Next Steps

**Current status:** Local prototype complete. Building toward private preview.

**Target:** Private preview in ~1 month (end of December 2024). Solid and polished, not rushed.

**Path to hosted preview:**

Week 1-2: Infrastructure
- [ ] Deploy to hosted platform (Railway/Render/Fly)
- [ ] Auth integration (Clerk or Supabase)
- [ ] Provider-managed API keys (users don't need their own)
- [ ] Per-user file storage (simple persistent volume initially, S3 later)

Week 2-3: Billing & Limits
- [ ] Usage tracking (queries per user)
- [ ] Free tier with caps
- [ ] Stripe integration ($10/mo subscription)

Week 3-4: Polish
- [ ] Landing page
- [ ] Onboarding flow
- [ ] Error handling & edge cases
- [ ] Visual polish, mobile-responsive

**Hypothesis to validate:** Do non-AI-adopters find Gimbal useful when they try it? Do they come back?

## Cloud Architecture (2024-11-30)

**Principle:** Docker container as the abstraction. Portable between any container runner.

**Target stack (AWS):**

```
CloudFront (CDN, optional)
     ↓
App Runner (Docker container)
     ↓
RDS Postgres + S3
```

**Components:**

| Component | Service | Purpose |
|-----------|---------|---------|
| Compute | App Runner | Runs our Docker image, auto-scales, managed SSL |
| Database | RDS Postgres | Users, projects metadata, sessions, usage tracking |
| File storage | S3 | Project files (replaces local filesystem) |
| Secrets | Secrets Manager | API keys, DB credentials |
| CDN | CloudFront | Static assets, optional |
| Auth | Pluggable | Clerk or Supabase initially, roll-our-own later if needed |

**Why App Runner over Fargate:**
- Simpler (no clusters, task definitions, services)
- Push container → get URL
- Auto-scales including to zero
- Sufficient control for a single-service app

**Container contract:**
- Exposes port 3001
- Env vars: `DATABASE_URL`, `S3_BUCKET`, `ANTHROPIC_API_KEY`, `STRIPE_KEY`, etc.
- Stateless - all persistence in Postgres/S3

**Migration from local prototype:**

| Local | Hosted |
|-------|--------|
| `~/Documents/Gimbal/` | S3 bucket |
| `~/.gimbal/projects.json` | Postgres |
| In-memory session map | Postgres |
| No auth | Auth provider |
| User's API key | Our API key |

**Auth strategy:**

Pluggable auth behind an interface:

```typescript
interface AuthProvider {
  validateSession(token: string): Promise<string | null>  // returns userId
  createSession(userId: string): Promise<string>          // returns token
  destroySession(token: string): Promise<void>
  createUser(email: string, password: string): Promise<string>
  verifyCredentials(email: string, password: string): Promise<string | null>
}
```

- **Day 1:** Use Clerk or Supabase Auth (fast, proven)
- **Later:** Swap in roll-our-own if we want to drop the dependency

App code calls the interface, doesn't know what's behind it.

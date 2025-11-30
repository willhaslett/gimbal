# Gimbal

A GUI wrapper for Claude Code, aimed at semi-technical users doing work that produces digital artifacts.

## Concept

- **Project-centric**: Unlimited projects, each initialized from templates with sensible defaults. A project is a container where artifacts accumulate over time.
- **Project file tree**: Left panel shows files organized by project, not raw filesystem
- **Structured responses only**: Claude returns data conforming to our domain schema; Gimbal renders it
- **Batteries-included tools**: MCP servers exposed to Claude for capabilities like data fetching
- **Stack**: TypeScript/React frontend, Node backend, Claude Agent SDK

## Open Questions

- Schema design for structured responses (central design concern)
- Tool library scope and design
- Session/state management per project

## Development

```bash
cd ~/code/gimbal
pnpm install          # Install dependencies
pnpm --filter @gimbal/server dev   # Run server (port 3001)
pnpm --filter @gimbal/client dev   # Run client (port 5173)
```

## Project Structure

```
gimbal/
├── packages/
│   ├── client/       # React frontend (Vite)
│   └── server/       # Node backend (Express, Claude Agent SDK)
├── archive/          # Legacy Python code (not tracked)
├── ARCHITECTURE.md
└── CLAUDE.md
```

## Current Status

Core loop validated:
- Client sends prompt to server
- Server calls Claude Agent SDK with MCP filesystem server configured
- Claude can call tools (read files, list directories)
- Response flows back to client and displays as JSON

Next: structured response schema, project model, richer UI.

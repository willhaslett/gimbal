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
│   └── server/       # Node backend (Express)
├── archive/          # Legacy Python code (not tracked)
├── ARCHITECTURE.md
└── CLAUDE.md
```

## Current Status

Stack set up. Next: POC to validate core loop (send prompt → SDK → MCP tool call → structured response).

# Gimbal

A GUI wrapper for Claude Code, aimed at semi-technical users doing data analysis and everyday work.

## Concept

- **Project-centric**: Unlimited projects, each initialized from templates with sensible defaults
- **Project file tree**: Left panel shows files organized by project, not raw filesystem
- **Structured responses only**: Claude returns data conforming to our domain schema; Gimbal renders it
- **Batteries-included tools**: MCP servers exposed to Claude for capabilities like data fetching
- **Stack**: TypeScript/React frontend, Node backend, Claude Agent SDK

## Open Questions

- Does the Claude Agent SDK support wiring up custom MCP servers for tool execution?
- Schema design for structured responses (central design concern)
- Tool library scope and design
- Session/state management per project

## Development

```bash
cd ~/code/gimbal
uv sync
uv run python src/gimbal_setup.py  # (legacy - to be replaced)
```

## Current Status

Early exploration. Existing Python code is from previous MCP-installer concept and will be replaced.

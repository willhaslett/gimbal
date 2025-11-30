# Gimbal

A GUI wrapper for Claude Code, aimed at semi-technical users doing data analysis and everyday work.

## Development

```bash
cd ~/code/gimbal
uv sync                              # Install dependencies
uv run python src/gimbal_setup.py    # Run the app
```

## Current Status

Early exploration - pivoting from previous MCP server installer concept to GUI wrapper for Claude Code.

## File Structure

```
~/code/gimbal/
├── CLAUDE.md              # This file
├── pyproject.toml         # uv project config
├── src/
│   ├── filesystem_server.py   # MCP filesystem server (may be useful)
│   └── gimbal_setup.py        # Setup app (to be reworked)
```

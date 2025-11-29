# Project: claude-workspace-app (Gimbal)

## Overview

A macOS app that configures Claude Desktop with MCP servers for filesystem access and web fetching, requiring zero dependencies from the end user.

**Goal:** Enable non-technical users (like Sara, a community planner) to use Claude Desktop with file management and web fetch capabilities without needing to install Python, Node.js, or use the command line.

**Business potential:** Could be a paid app - wrapper around Claude Desktop that adds MCP capabilities. Legal considerations reviewed (MCP is MIT licensed, we don't redistribute Claude Desktop).

## Architecture

```
Gimbal Setup.app
├── Bundles standalone MCP server binaries (no Python/Node required)
├── Creates ~/.gimbal/ directory structure
├── Writes Claude Desktop MCP config
└── User double-clicks, everything just works
```

### MCP Servers

1. **mcp-filesystem** (our own, `src/filesystem_server.py`)
   - Built with Python MCP SDK
   - Tools: read_file, write_file, list_directory, create_directory, delete_file, move_file
   - Restricts access to allowed directories only

2. **mcp-fetch** (official Anthropic `mcp-server-fetch`)
   - Fetches web content and converts to markdown
   - Enables Claude to download data from APIs, websites

### Build Process

- Use PyInstaller to create standalone binaries
- Binaries bundle Python runtime (~20-25MB each)
- No external dependencies at runtime

## Current Status

### Completed
- [x] Verified mcp-server-fetch works
- [x] Wrote custom Python filesystem MCP server
- [x] Tested both servers with Claude Desktop (via venv)
- [x] Built standalone binaries with PyInstaller
- [x] Tested standalone binaries with Claude Desktop - **working**
- [x] Created Gimbal Setup.app (~55MB total)
- [x] Tested full install flow - **working**

### Pending
- [ ] Test on clean environment (Sara's machine or fresh user)
- [ ] Address startup timing issue (servers take a moment to initialize on first launch)
- [ ] Consider code signing / notarization for distribution

## File Structure

```
~/.claude_workspace/projects/claude-workspace-app/
├── CLAUDE.md              # This file
├── pyproject.toml         # uv project config
├── src/
│   ├── filesystem_server.py   # Our MCP filesystem server
│   └── gimbal_setup.py        # Setup app source
├── dist/
│   ├── Gimbal Setup.app   # THE APP - ready to distribute
│   ├── mcp-filesystem     # Standalone binary (19MB)
│   └── mcp-fetch          # Standalone binary (24MB)
└── build/                 # PyInstaller build artifacts
```

## Usage

### For end users
1. Double-click `Gimbal Setup.app`
2. Click "Continue"
3. Quit and reopen Claude Desktop
4. Ask Claude to "list files in ~/.gimbal"

### For development
```bash
cd ~/.claude_workspace/projects/claude-workspace-app
uv run python src/gimbal_setup.py  # Test setup script
uv run pyinstaller ...             # Rebuild binaries
```

## Key Decisions

1. **App name: Gimbal** - Neutral, brandable name that avoids trademark issues with "Claude"

2. **Rolled our own filesystem server** - The PyPI `mcp-server-filesystem` package was malicious (launched Calculator on import). We wrote a minimal one using the MCP Python SDK.

3. **Using uv for development** - Cleaner than venv, all dev work in project directory.

4. **Python-only stack** - Eliminated Node.js dependency by using Python MCP servers for everything.

5. **Standalone binaries** - PyInstaller bundles Python runtime so users need nothing installed.

6. **Native macOS dialogs** - Used osascript instead of tkinter (which isn't available in Homebrew Python).

## Notes

- Malicious package `mcp-server-filesystem` on PyPI should be reported to security@pypi.org
- The legitimate GitHub repo (MarcusJellinghaus/mcp_server_filesystem) has different code - PyPI package is an imposter
- Startup timing: binaries take ~1-2 seconds to initialize on first run (unpacking bundled Python)

## Last Updated
2025-11-28

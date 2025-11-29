# Gimbal

A macOS app that configures Claude Desktop with MCP servers for filesystem access and web fetching, requiring zero dependencies from the end user.

## Quick Start (Development)

```bash
cd ~/code/gimbal
uv sync                              # Install dependencies
uv run python src/gimbal_setup.py    # Test setup script locally
```

## Build Commands

```bash
# Build MCP server binaries
uv run pyinstaller --onefile --name mcp-filesystem src/filesystem_server.py
uv run pyinstaller --onefile --name mcp-fetch $(uv run python -c "import mcp_server_fetch; print(mcp_server_fetch.__file__.replace('__init__.py', '__main__.py'))")

# Build the .app bundle (after building binaries above)
uv run pyinstaller \
  --name "Gimbal Setup" \
  --onedir \
  --windowed \
  --add-data "dist/mcp-filesystem:." \
  --add-data "dist/mcp-fetch:." \
  src/gimbal_setup.py
```

Output: `dist/Gimbal Setup.app` (~55MB)

## What It Does

User double-clicks `Gimbal Setup.app`, which:
1. Creates `~/.gimbal/` directory structure
2. Copies bundled MCP server binaries to `~/.gimbal/mcp/bin/`
3. Configures Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

Then Claude Desktop can read/write files in `~/.gimbal/` and fetch web content.

## Architecture

### MCP Servers

1. **mcp-filesystem** (`src/filesystem_server.py`)
   - Our own, built with Python MCP SDK
   - Tools: read_file, write_file, list_directory, create_directory, delete_file, move_file
   - Restricts access to allowed directories only

2. **mcp-fetch** (official Anthropic `mcp-server-fetch` from PyPI)
   - Fetches web content and converts to markdown

### Build Process

- PyInstaller bundles Python runtime into standalone binaries
- No Python/Node.js required on end user's machine
- `dist/` is gitignored - must rebuild after cloning

## File Structure

```
~/code/gimbal/
├── CLAUDE.md              # This file
├── pyproject.toml         # uv project config
├── src/
│   ├── filesystem_server.py   # MCP filesystem server
│   └── gimbal_setup.py        # Setup app source
├── dist/                  # Built artifacts (gitignored)
│   ├── Gimbal Setup.app
│   ├── mcp-filesystem
│   └── mcp-fetch
└── build/                 # PyInstaller temp files (gitignored)
```

## Current Status

### Working
- Both MCP servers functional with Claude Desktop
- Standalone binaries (no runtime deps)
- Setup app with native macOS dialogs
- Full install flow tested

### Pending
- [ ] Test on clean environment (Sara's machine)
- [ ] Address startup timing (servers take 1-2s to initialize on first launch)
- [ ] Code signing / notarization for distribution

## Key Decisions

1. **App name: Gimbal** - Neutral name avoiding "Claude" trademark issues

2. **Rolled our own filesystem server** - PyPI `mcp-server-filesystem` was malicious (launched Calculator on import). Reported to security@pypi.org.

3. **Python-only stack** - Eliminated Node.js dependency entirely

4. **Native macOS dialogs** - osascript instead of tkinter (unavailable in Homebrew Python)

## Target User

Sara (community planner) - needs Claude Desktop to download Census data and save files, but isn't a command-line user. This app makes MCP "just work" for non-technical users.

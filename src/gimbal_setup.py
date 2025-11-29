"""
Gimbal Setup App

Creates the ~/.gimbal directory structure, installs MCP server binaries,
and configures Claude Desktop.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


# Paths
GIMBAL_DIR = Path.home() / ".gimbal"
PROJECTS_DIR = GIMBAL_DIR / "projects"
MCP_BIN_DIR = GIMBAL_DIR / "mcp" / "bin"
CLAUDE_CONFIG_DIR = Path.home() / "Library" / "Application Support" / "Claude"
CLAUDE_CONFIG_FILE = CLAUDE_CONFIG_DIR / "claude_desktop_config.json"


def get_bundle_dir() -> Path:
    """Get the directory where bundled resources are located."""
    if getattr(sys, 'frozen', False):
        # Running as compiled
        return Path(sys._MEIPASS)
    else:
        # Running in development
        return Path(__file__).parent.parent / "dist"


def create_directory_structure():
    """Create the ~/.gimbal directory structure."""
    GIMBAL_DIR.mkdir(exist_ok=True)
    PROJECTS_DIR.mkdir(exist_ok=True)
    MCP_BIN_DIR.mkdir(parents=True, exist_ok=True)

    # Create CLAUDE.md
    claude_md = GIMBAL_DIR / "CLAUDE.md"
    if not claude_md.exists():
        claude_md.write_text("""# Gimbal Workspace

This directory (`~/.gimbal`) is a managed workspace where Claude (via Claude Desktop + MCP) can read and write files.

## Structure

```
~/.gimbal/
├── CLAUDE.md           # This file
├── mcp/
│   └── bin/            # MCP server binaries
└── projects/
    └── <project_name>/
        ├── CLAUDE.md   # Project-specific context
        ├── downloads/  # Raw files fetched from the web
        ├── scripts/    # Processing scripts
        └── data/       # Processed/final data
```

## Creating Projects

Create a new project folder under `projects/` with the structure above.
Ask Claude to help you set up a new project!

## Capabilities

Claude Desktop can now:
- **Read and write files** in this ~/.gimbal directory
- **Fetch web content** from URLs (APIs, websites, data sources)

## Limitations

Claude can only access files within ~/.gimbal. To work with files elsewhere,
copy them into a project folder first.
""")


def install_mcp_binaries():
    """Copy MCP server binaries to ~/.gimbal/mcp/bin/."""
    bundle_dir = get_bundle_dir()

    binaries = ["mcp-filesystem", "mcp-fetch"]

    for binary in binaries:
        src = bundle_dir / binary
        dst = MCP_BIN_DIR / binary

        if src.exists():
            shutil.copy2(src, dst)
            # Make executable
            dst.chmod(0o755)
        else:
            raise FileNotFoundError(f"Binary not found: {src}")


def configure_claude_desktop():
    """Write or update Claude Desktop MCP configuration."""
    CLAUDE_CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    # Backup existing config
    if CLAUDE_CONFIG_FILE.exists():
        backup = CLAUDE_CONFIG_FILE.with_suffix(".json.bak")
        shutil.copy2(CLAUDE_CONFIG_FILE, backup)

        # Load existing config
        with open(CLAUDE_CONFIG_FILE) as f:
            config = json.load(f)
    else:
        config = {}

    # Ensure mcpServers key exists
    if "mcpServers" not in config:
        config["mcpServers"] = {}

    # Add our servers
    config["mcpServers"]["filesystem"] = {
        "command": str(MCP_BIN_DIR / "mcp-filesystem"),
        "args": [str(GIMBAL_DIR)]
    }

    config["mcpServers"]["fetch"] = {
        "command": str(MCP_BIN_DIR / "mcp-fetch")
    }

    # Write config
    with open(CLAUDE_CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def run_setup():
    """Run the full setup process."""
    steps = [
        ("Creating directory structure...", create_directory_structure),
        ("Installing MCP servers...", install_mcp_binaries),
        ("Configuring Claude Desktop...", configure_claude_desktop),
    ]

    for message, func in steps:
        print(message)
        func()

    print("Setup complete!")


def show_dialog(title: str, message: str, dialog_type: str = "info") -> bool:
    """Show a macOS dialog using osascript. Returns True if user clicked OK/Yes."""
    if dialog_type == "yesno":
        script = f'''
        tell application "System Events"
            display dialog "{message}" with title "{title}" buttons {{"Cancel", "Continue"}} default button "Continue"
        end tell
        '''
    elif dialog_type == "error":
        script = f'''
        tell application "System Events"
            display dialog "{message}" with title "{title}" buttons {{"OK"}} default button "OK" with icon stop
        end tell
        '''
    else:
        script = f'''
        tell application "System Events"
            display dialog "{message}" with title "{title}" buttons {{"OK"}} default button "OK"
        end tell
        '''

    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True
    )
    return result.returncode == 0


def main():
    """Main entry point with GUI."""
    # Show confirmation dialog
    result = show_dialog(
        "Gimbal Setup",
        "This will set up Gimbal for Claude Desktop:\\n\\n"
        "• Create ~/.gimbal/ workspace directory\\n"
        "• Install MCP servers for file access and web fetching\\n"
        "• Configure Claude Desktop to use these servers\\n\\n"
        "Continue?",
        "yesno"
    )

    if not result:
        sys.exit(0)

    try:
        run_setup()
        show_dialog(
            "Gimbal Setup",
            "Setup complete!\\n\\n"
            "Next steps:\\n"
            "1. Quit Claude Desktop (Cmd+Q)\\n"
            "2. Reopen Claude Desktop\\n"
            "3. Ask Claude to list files in ~/.gimbal\\n\\n"
            "Enjoy!"
        )
    except Exception as e:
        show_dialog(
            "Gimbal Setup Error",
            f"Setup failed:\\n\\n{str(e)}",
            "error"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

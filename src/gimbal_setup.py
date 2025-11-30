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
GIMBAL_DIR = Path.home() / "Documents" / "Gimbal"
PROJECTS_DIR = GIMBAL_DIR / "projects"
GIMBAL_APP_SUPPORT = Path.home() / "Library" / "Application Support" / "Gimbal"
MCP_BIN_DIR = GIMBAL_APP_SUPPORT / "bin"
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
    """Create the ~/Documents/Gimbal directory structure and app support directories."""
    GIMBAL_DIR.mkdir(exist_ok=True)
    PROJECTS_DIR.mkdir(exist_ok=True)
    MCP_BIN_DIR.mkdir(parents=True, exist_ok=True)

    # Create CLAUDE.md
    claude_md = GIMBAL_DIR / "CLAUDE.md"
    if not claude_md.exists():
        claude_md.write_text("""# Gimbal Workspace

You have access to a local workspace at ~/Documents/Gimbal where you can help the user with data projects. This is powered by Gimbal, which gives you filesystem and web access through MCP servers.

## What You Can Do

**Fetch data from the web** - Download files, call APIs, scrape websites
**Save and organize files** - Store downloads, scripts, and processed data locally
**Create and run scripts** - Write Python or shell scripts for data processing
**Generate reports** - Create markdown, CSV, or other output files

## Available MCP Tools

### Project Management
- `list_projects` - Show all projects in the workspace
- `create_project` - Create a new project with standard folder structure
- `open_in_finder` - Open a folder in Finder for the user to browse

### File Operations
- `read_file` / `write_file` - Read and write file contents
- `list_directory` - List contents of a directory
- `create_directory` - Create a new directory
- `move_file` / `delete_file` - Move or delete files

### Web Access
- `fetch` - Fetch content from any URL (via mcp-fetch server)

## Project Structure

Each project in `~/Documents/Gimbal/projects/` follows this layout:

```
project-name/
├── CLAUDE.md   # Project context and notes
├── downloads/  # Raw files from the web
├── scripts/    # Processing scripts
└── data/       # Processed/final outputs
```

## Getting Started

When the user wants to start a new data project, use `create_project` to set up the folder structure, then help them fetch data, write processing scripts, and generate outputs.

Example workflow:
1. User: "I want to analyze Census data for my county"
2. Create a project: `create_project("census-analysis", "Demographic analysis for County X")`
3. Fetch data from Census API or data.census.gov
4. Save raw data to downloads/
5. Write a Python script in scripts/ to process it
6. Output results to data/

## Limitations

- You can only access files within ~/Documents/Gimbal
- To work with files from elsewhere, ask the user to copy them into a project folder
""")


def install_mcp_binaries():
    """Copy MCP server binaries to ~/Library/Application Support/Gimbal/bin/."""
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
        "• Create ~/Documents/Gimbal/ workspace directory\\n"
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
            "3. Ask Claude to list files in ~/Documents/Gimbal\\n\\n"
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

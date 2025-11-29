"""
Minimal MCP Filesystem Server

Provides read, write, and list operations within allowed directories.
"""

import subprocess
import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP

# Initialize server
mcp = FastMCP(name="filesystem")

# Allowed directories - set via command line or defaults to home
ALLOWED_DIRECTORIES: list[Path] = []

# Projects directory (first allowed directory + /projects)
PROJECTS_DIR: Path | None = None


def is_path_allowed(path: Path) -> bool:
    """Check if path is within allowed directories."""
    resolved = path.resolve()
    for allowed in ALLOWED_DIRECTORIES:
        try:
            resolved.relative_to(allowed)
            return True
        except ValueError:
            continue
    return False


def validate_path(path_str: str) -> Path:
    """Validate and resolve a path, raising error if not allowed."""
    path = Path(path_str).expanduser().resolve()
    if not is_path_allowed(path):
        raise ValueError(f"Path not allowed: {path}. Allowed directories: {ALLOWED_DIRECTORIES}")
    return path


@mcp.tool()
def read_file(path: str) -> str:
    """Read the contents of a file.

    Args:
        path: Path to the file to read

    Returns:
        The file contents as text
    """
    file_path = validate_path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if not file_path.is_file():
        raise ValueError(f"Not a file: {path}")
    return file_path.read_text()


@mcp.tool()
def write_file(path: str, content: str) -> str:
    """Write content to a file. Creates the file if it doesn't exist, overwrites if it does.

    Args:
        path: Path to the file to write
        content: Content to write to the file

    Returns:
        Confirmation message
    """
    file_path = validate_path(path)
    # Create parent directories if needed
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content)
    return f"Successfully wrote {len(content)} characters to {path}"


@mcp.tool()
def list_directory(path: str) -> str:
    """List contents of a directory.

    Args:
        path: Path to the directory to list

    Returns:
        Formatted listing of directory contents
    """
    dir_path = validate_path(path)
    if not dir_path.exists():
        raise FileNotFoundError(f"Directory not found: {path}")
    if not dir_path.is_dir():
        raise ValueError(f"Not a directory: {path}")

    entries = []
    for entry in sorted(dir_path.iterdir()):
        if entry.is_dir():
            entries.append(f"[DIR]  {entry.name}/")
        else:
            size = entry.stat().st_size
            entries.append(f"[FILE] {entry.name} ({size} bytes)")

    return "\n".join(entries) if entries else "(empty directory)"


@mcp.tool()
def create_directory(path: str) -> str:
    """Create a directory (and any necessary parent directories).

    Args:
        path: Path to the directory to create

    Returns:
        Confirmation message
    """
    dir_path = validate_path(path)
    dir_path.mkdir(parents=True, exist_ok=True)
    return f"Successfully created directory: {path}"


@mcp.tool()
def delete_file(path: str) -> str:
    """Delete a file.

    Args:
        path: Path to the file to delete

    Returns:
        Confirmation message
    """
    file_path = validate_path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if not file_path.is_file():
        raise ValueError(f"Not a file (use delete on files only): {path}")
    file_path.unlink()
    return f"Successfully deleted: {path}"


@mcp.tool()
def move_file(source: str, destination: str) -> str:
    """Move or rename a file or directory.

    Args:
        source: Current path
        destination: New path

    Returns:
        Confirmation message
    """
    src_path = validate_path(source)
    dst_path = validate_path(destination)

    if not src_path.exists():
        raise FileNotFoundError(f"Source not found: {source}")

    src_path.rename(dst_path)
    return f"Successfully moved {source} to {destination}"


@mcp.tool()
def list_projects() -> str:
    """List all projects in the Gimbal workspace.

    Returns:
        Formatted listing of projects with their descriptions
    """
    if PROJECTS_DIR is None or not PROJECTS_DIR.exists():
        return "No projects directory found."

    projects = []
    for entry in sorted(PROJECTS_DIR.iterdir()):
        if entry.is_dir() and not entry.name.startswith('.'):
            # Try to read project description from CLAUDE.md
            claude_md = entry / "CLAUDE.md"
            description = ""
            if claude_md.exists():
                content = claude_md.read_text()
                # Get first non-empty, non-heading line as description
                for line in content.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        description = line[:100]  # Truncate long descriptions
                        break
            projects.append(f"• {entry.name}" + (f" - {description}" if description else ""))

    if not projects:
        return "No projects yet. Use create_project to create one!"

    return "Projects:\n" + "\n".join(projects)


@mcp.tool()
def create_project(name: str, description: str = "") -> str:
    """Create a new project with standard directory structure.

    Args:
        name: Project name (will be used as folder name)
        description: Brief description of the project

    Returns:
        Confirmation message with project path
    """
    if PROJECTS_DIR is None:
        raise ValueError("Projects directory not configured")

    # Sanitize project name
    safe_name = "".join(c for c in name if c.isalnum() or c in "-_ ").strip()
    safe_name = safe_name.replace(" ", "-").lower()

    if not safe_name:
        raise ValueError("Invalid project name")

    project_path = PROJECTS_DIR / safe_name

    if project_path.exists():
        raise ValueError(f"Project already exists: {safe_name}")

    # Create project structure
    project_path.mkdir(parents=True)
    (project_path / "downloads").mkdir()
    (project_path / "scripts").mkdir()
    (project_path / "data").mkdir()

    # Create project CLAUDE.md
    claude_md_content = f"""# {name}

{description}

## Structure

- `downloads/` - Raw files fetched from the web
- `scripts/` - Processing scripts
- `data/` - Processed/final data

## Notes

Add project-specific notes and context here.
"""
    (project_path / "CLAUDE.md").write_text(claude_md_content)

    return f"Created project '{safe_name}' at {project_path}"


@mcp.tool()
def open_in_finder(path: str = "") -> str:
    """Open a path in Finder.

    Args:
        path: Path to open (defaults to Gimbal workspace root)

    Returns:
        Confirmation message
    """
    if path:
        target_path = validate_path(path)
    elif ALLOWED_DIRECTORIES:
        target_path = ALLOWED_DIRECTORIES[0]
    else:
        raise ValueError("No path specified and no default directory available")

    if not target_path.exists():
        raise FileNotFoundError(f"Path not found: {path}")

    subprocess.run(["open", str(target_path)], check=True)
    return f"Opened {target_path} in Finder"


def main():
    """Main entry point."""
    global ALLOWED_DIRECTORIES, PROJECTS_DIR

    # Parse allowed directories from command line
    if len(sys.argv) < 2:
        print("Usage: filesystem_server.py <allowed_directory> [additional_directories...]", file=sys.stderr)
        print("Example: filesystem_server.py ~/Documents/Gimbal", file=sys.stderr)
        sys.exit(1)

    for dir_arg in sys.argv[1:]:
        dir_path = Path(dir_arg).expanduser().resolve()
        if not dir_path.is_dir():
            print(f"Warning: {dir_arg} is not a directory, skipping", file=sys.stderr)
            continue
        ALLOWED_DIRECTORIES.append(dir_path)

    if not ALLOWED_DIRECTORIES:
        print("Error: No valid directories provided", file=sys.stderr)
        sys.exit(1)

    # Set projects directory (assumes first allowed dir is Gimbal workspace)
    PROJECTS_DIR = ALLOWED_DIRECTORIES[0] / "projects"

    print(f"Starting filesystem server with allowed directories: {ALLOWED_DIRECTORIES}", file=sys.stderr)
    mcp.run()


if __name__ == "__main__":
    main()

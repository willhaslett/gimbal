import { mkdir, readFile, writeFile, readdir, stat, unlink, rmdir } from 'fs/promises'
import { join, resolve, relative } from 'path'

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: string
}

/**
 * Ensures a path is within the project directory (prevents path traversal attacks)
 */
function securePath(projectPath: string, relativePath: string): string {
  const fullPath = resolve(projectPath, relativePath)
  const normalizedProject = resolve(projectPath)

  if (!fullPath.startsWith(normalizedProject)) {
    throw new Error('Path outside project directory')
  }

  return fullPath
}

/**
 * List directory contents
 */
export async function listDirectory(projectPath: string, relativePath: string = ''): Promise<FileEntry[]> {
  const dirPath = securePath(projectPath, relativePath)
  const entries = await readdir(dirPath, { withFileTypes: true })

  const results: FileEntry[] = []
  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name)
    const entryRelPath = relative(projectPath, entryPath)

    if (entry.isDirectory()) {
      results.push({
        name: entry.name,
        path: entryRelPath,
        type: 'directory',
      })
    } else if (entry.isFile()) {
      const stats = await stat(entryPath)
      results.push({
        name: entry.name,
        path: entryRelPath,
        type: 'file',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      })
    }
  }

  return results.sort((a, b) => {
    // Directories first, then files
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * Read file contents
 */
export async function readProjectFile(projectPath: string, relativePath: string): Promise<string> {
  const filePath = securePath(projectPath, relativePath)
  return readFile(filePath, 'utf-8')
}

/**
 * Write file contents
 */
export async function writeProjectFile(
  projectPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = securePath(projectPath, relativePath)
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Delete a file or empty directory
 */
export async function deleteProjectFile(projectPath: string, relativePath: string): Promise<void> {
  const filePath = securePath(projectPath, relativePath)
  const stats = await stat(filePath)

  if (stats.isDirectory()) {
    await rmdir(filePath)
  } else {
    await unlink(filePath)
  }
}

/**
 * Create a directory
 */
export async function createProjectDirectory(projectPath: string, relativePath: string): Promise<void> {
  const dirPath = securePath(projectPath, relativePath)
  await mkdir(dirPath, { recursive: true })
}

/**
 * Get file or directory info
 */
export async function getFileInfo(projectPath: string, relativePath: string): Promise<FileEntry> {
  const filePath = securePath(projectPath, relativePath)
  const stats = await stat(filePath)
  const name = relativePath.split('/').pop() || relativePath

  return {
    name,
    path: relativePath,
    type: stats.isDirectory() ? 'directory' : 'file',
    size: stats.isFile() ? stats.size : undefined,
    modifiedAt: stats.mtime.toISOString(),
  }
}

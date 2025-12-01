import { useState, useEffect } from 'react'
import { listProjects, createProject, deleteProject, Project, FileEntry, listFiles, readFile } from '../api'
import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'

// Format date as relative (today, yesterday, or date)
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface FileTreeInlineProps {
  projectId: string
  onFileSelect: (file: FileEntry) => void
}

// Unified tree node component - works for both files and directories
interface TreeNodeProps {
  projectId: string
  file: FileEntry
  depth: number
  expanded: Set<string>
  onToggle: (path: string) => void
  onFileSelect: (file: FileEntry) => void
  files: FileEntry[]
}

function TreeNode({ projectId, file, depth, expanded, onToggle, onFileSelect, files }: TreeNodeProps) {
  const isDir = file.type === 'directory'
  const isExpanded = expanded.has(file.path)

  const children = files.filter((f) => {
    const parent = f.path.substring(0, f.path.lastIndexOf('/'))
    return parent === file.path
  })

  return (
    <div>
      <div
        onClick={async () => {
          if (isDir) {
            onToggle(file.path)
          } else {
            const fileWithContent = await readFile(projectId, file.path)
            onFileSelect(fileWithContent)
          }
        }}
        style={{
          padding: '0.2rem 0.5rem',
          paddingLeft: `${0.5 + depth * 0.875}rem`,
          cursor: 'pointer',
          fontSize: '0.8rem',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.35rem',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ width: '12px', display: 'flex', alignItems: 'center', marginTop: '0.15rem', flexShrink: 0 }}>
          {isDir && (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        </span>
        <span style={{ marginTop: '0.1rem', flexShrink: 0, color: isDir ? 'var(--color-icon-folder)' : 'var(--color-icon-file)' }}>
          {isDir ? (
            isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />
          ) : (
            <File size={14} />
          )}
        </span>
        <span>{file.name}</span>
      </div>
      {isDir && isExpanded && children.map((child) => (
        <TreeNode
          key={child.path}
          projectId={projectId}
          file={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onFileSelect={onFileSelect}
          files={files}
        />
      ))}
    </div>
  )
}

function FileTreeInline({ projectId, onFileSelect }: FileTreeInlineProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    listFiles(projectId).then(setFiles)
  }, [projectId])

  const toggleDir = async (path: string) => {
    if (expanded.has(path)) {
      setExpanded((prev) => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })
    } else {
      const children = await listFiles(projectId, path)
      setFiles((prev) => {
        const withoutOldChildren = prev.filter(
          (f) => !f.path.startsWith(path + '/') || f.path === path
        )
        return [...withoutOldChildren, ...children]
      })
      setExpanded((prev) => new Set(prev).add(path))
    }
  }

  // Get root-level files only
  const rootFiles = files.filter((f) => !f.path.includes('/'))

  return (
    <div>
      {rootFiles.map((file) => (
        <TreeNode
          key={file.path}
          projectId={projectId}
          file={file}
          depth={1}
          expanded={expanded}
          onToggle={toggleDir}
          onFileSelect={onFileSelect}
          files={files}
        />
      ))}
    </div>
  )
}

interface Props {
  selectedProject: Project | null
  onSelectProject: (project: Project | null) => void
  onFileSelect: (file: FileEntry) => void
  fileTreeKey: number
}

const DEFAULT_PROJECTS_PATH = '~/Documents/Gimbal'

export function ProjectList({ selectedProject, onSelectProject, onFileSelect, fileTreeKey }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const loadProjects = () => {
    listProjects().then(setProjects)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    const project = await createProject(newName.trim(), DEFAULT_PROJECTS_PATH)
    setProjects([...projects, project])
    onSelectProject(project)
    setShowCreate(false)
    setNewName('')
  }

  const handleDelete = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    if (!confirm(`Delete "${project.name}"? The files will remain on disk.`)) return

    await deleteProject(project.id)
    setProjects(projects.filter((p) => p.id !== project.id))
    if (selectedProject?.id === project.id) {
      onSelectProject(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontFamily: '"Baloo 2", "Comic Sans MS", "Marker Felt", cursive',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            letterSpacing: '-0.5px',
          }}
        >
          Gimbal
        </span>
      </div>

      {/* Projects Header */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projects</span>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          + New
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          style={{
            padding: '0.75rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-tertiary)',
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            autoFocus
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--color-border-light)',
              borderRadius: '4px',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={!newName.trim()}
              style={{
                flex: 1,
                padding: '0.375rem',
                background: newName.trim() ? 'var(--color-primary)' : 'var(--color-disabled)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: newName.trim() ? 'pointer' : 'default',
              }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setNewName('')
              }}
              style={{
                padding: '0.375rem 0.75rem',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Project List with inline file trees */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {projects.length === 0 && !showCreate && (
          <div style={{ padding: '1rem', color: 'var(--color-text-faint)', fontSize: '0.875rem', textAlign: 'center' }}>
            No projects yet
          </div>
        )}
        {projects.map((project) => {
          const isSelected = selectedProject?.id === project.id
          return (
            <div key={project.id}>
              {/* Project Header - depth 0 of tree */}
              <div
                onClick={() => onSelectProject(isSelected ? null : project)}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  padding: '0.2rem 0.5rem',
                  paddingLeft: '0.5rem',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--color-primary-light)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span style={{ width: '12px', display: 'flex', alignItems: 'center' }}>
                  {isSelected ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
                <span style={{ color: 'var(--color-primary)' }}>
                  <Folder size={14} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.8rem' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-faint)' }}>
                    {formatDate(project.createdAt)}
                  </div>
                </div>
                {hoveredId === project.id && (
                  <button
                    onClick={(e) => handleDelete(e, project)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-faint)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      fontSize: '0.875rem',
                    }}
                    title="Delete project"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Inline File Tree (only for selected project) */}
              {isSelected && (
                <FileTreeInline
                  key={fileTreeKey}
                  projectId={project.id}
                  onFileSelect={onFileSelect}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

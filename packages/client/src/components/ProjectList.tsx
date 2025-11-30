import { useState, useEffect } from 'react'
import { listProjects, createProject, deleteProject, Project, FileEntry, listFiles } from '../api'

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

  const renderFiles = (parentPath: string, depth: number): JSX.Element[] => {
    return files
      .filter((f) => {
        if (parentPath === '') {
          return !f.path.includes('/')
        }
        const parent = f.path.substring(0, f.path.lastIndexOf('/'))
        return parent === parentPath
      })
      .map((file) => (
        <div key={file.path}>
          <div
            onClick={() => {
              if (file.type === 'directory') {
                toggleDir(file.path)
              } else {
                onFileSelect(file)
              }
            }}
            style={{
              padding: '0.25rem 0.5rem',
              paddingLeft: `${1 + depth * 0.75}rem`,
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#555',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>
              {file.type === 'directory' ? (expanded.has(file.path) ? '▼' : '▶') : ''}
            </span>
            <span>{file.type === 'directory' ? '📁' : '📄'}</span>
            <span>{file.name}</span>
          </div>
          {file.type === 'directory' && expanded.has(file.path) && renderFiles(file.path, depth + 1)}
        </div>
      ))
  }

  return <div style={{ background: '#f0f4f8' }}>{renderFiles('', 0)}</div>
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
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <span
          style={{
            fontFamily: '"Baloo 2", "Comic Sans MS", "Marker Felt", cursive',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#2196f3',
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
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projects</span>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: '#2196f3',
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
            borderBottom: '1px solid #e0e0e0',
            background: '#f5f5f5',
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
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={!newName.trim()}
              style={{
                flex: 1,
                padding: '0.375rem',
                background: newName.trim() ? '#2196f3' : '#ccc',
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
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
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
          <div style={{ padding: '1rem', color: '#999', fontSize: '0.875rem', textAlign: 'center' }}>
            No projects yet
          </div>
        )}
        {projects.map((project) => {
          const isSelected = selectedProject?.id === project.id
          return (
            <div key={project.id}>
              {/* Project Header */}
              <div
                onClick={() => onSelectProject(isSelected ? null : project)}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  background: isSelected ? '#e3f2fd' : 'transparent',
                  borderLeft: isSelected ? '3px solid #2196f3' : '3px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.875rem' }}>
                    {isSelected ? '▼ ' : '▶ '}{project.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginLeft: '1rem' }}>
                    {formatDate(project.createdAt)}
                  </div>
                </div>
                {hoveredId === project.id && (
                  <button
                    onClick={(e) => handleDelete(e, project)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999',
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

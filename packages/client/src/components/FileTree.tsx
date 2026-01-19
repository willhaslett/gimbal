import { useState, useEffect, useRef } from 'react'
import { listFiles, readFile, moveFile, revealInFinder, FileEntry } from '../api'

interface Props {
  projectId: string
  onFileSelect: (file: FileEntry) => void
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  entry: FileEntry | null
}

interface TreeNodeProps {
  entry: FileEntry
  projectId: string
  onFileSelect: (file: FileEntry) => void
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void
  level: number
  showDeleted: boolean
}

const DELETED_FOLDER = 'deleted'

function TreeNode({ entry, projectId, onFileSelect, onContextMenu, level, showDeleted }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<FileEntry[]>([])

  const handleClick = async () => {
    if (entry.type === 'directory') {
      if (!expanded) {
        const files = await listFiles(projectId, entry.path)
        setChildren(files)
      }
      setExpanded(!expanded)
    } else {
      const file = await readFile(projectId, entry.path)
      onFileSelect(file)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, entry)
  }

  // Filter children based on showDeleted
  const filteredChildren = showDeleted
    ? children
    : children.filter((child) => child.name !== DELETED_FOLDER)

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          padding: '0.25rem 0.5rem',
          paddingLeft: `${level * 1}rem`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ width: '1rem', textAlign: 'center' }}>
          {entry.type === 'directory' ? (expanded ? '▼' : '▶') : ''}
        </span>
        <span>{entry.type === 'directory' ? '📁' : '📄'}</span>
        <span>{entry.name}</span>
      </div>
      {expanded && filteredChildren.map((child) => (
        <TreeNode
          key={child.path}
          entry={child}
          projectId={projectId}
          onFileSelect={onFileSelect}
          onContextMenu={onContextMenu}
          level={level + 1}
          showDeleted={showDeleted}
        />
      ))}
    </div>
  )
}

export function FileTree({ projectId, onFileSelect }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    entry: null,
  })
  const menuRef = useRef<HTMLDivElement>(null)

  const loadFiles = async () => {
    setLoading(true)
    try {
      const loadedFiles = await listFiles(projectId)
      setFiles(loadedFiles)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [projectId])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      entry,
    })
  }

  const handleRevealInFinder = async () => {
    if (contextMenu.entry) {
      try {
        await revealInFinder(projectId, contextMenu.entry.path)
      } catch (err) {
        console.error('Failed to reveal in Finder:', err)
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleDelete = async () => {
    if (contextMenu.entry) {
      const entry = contextMenu.entry
      const fileName = entry.name
      const destPath = `${DELETED_FOLDER}/${fileName}`

      try {
        await moveFile(projectId, entry.path, destPath)
        // Refresh the file list
        await loadFiles()
      } catch (err) {
        console.error('Failed to delete file:', err)
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // Filter top-level files based on showDeleted
  const filteredFiles = showDeleted
    ? files
    : files.filter((f) => f.name !== DELETED_FOLDER)

  if (loading) {
    return <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Loading...</div>
  }

  return (
    <div style={{ fontSize: '0.875rem', position: 'relative' }}>
      {/* Show deleted checkbox */}
      <div
        style={{
          padding: '0.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          Show deleted
        </label>
      </div>

      {/* File tree */}
      {filteredFiles.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          projectId={projectId}
          onFileSelect={onFileSelect}
          onContextMenu={handleContextMenu}
          level={0}
          showDeleted={showDeleted}
        />
      ))}

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '150px',
          }}
        >
          <div
            onClick={handleRevealInFinder}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Reveal in Finder
          </div>
          <div
            onClick={handleDelete}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              color: 'var(--color-error-text)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Delete
          </div>
        </div>
      )}
    </div>
  )
}

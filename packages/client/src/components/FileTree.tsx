import { useState, useEffect } from 'react'
import { listFiles, readFile, FileEntry } from '../api'

interface Props {
  projectId: string
  onFileSelect: (file: FileEntry) => void
}

interface TreeNodeProps {
  entry: FileEntry
  projectId: string
  onFileSelect: (file: FileEntry) => void
  level: number
}

function TreeNode({ entry, projectId, onFileSelect, level }: TreeNodeProps) {
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

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          padding: '0.25rem 0.5rem',
          paddingLeft: `${level * 1}rem`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = '#f0f0f0')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ width: '1rem', textAlign: 'center' }}>
          {entry.type === 'directory' ? (expanded ? '▼' : '▶') : ''}
        </span>
        <span>{entry.type === 'directory' ? '📁' : '📄'}</span>
        <span>{entry.name}</span>
      </div>
      {expanded && children.map((child) => (
        <TreeNode
          key={child.path}
          entry={child}
          projectId={projectId}
          onFileSelect={onFileSelect}
          level={level + 1}
        />
      ))}
    </div>
  )
}

export function FileTree({ projectId, onFileSelect }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listFiles(projectId)
      .then(setFiles)
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return <div style={{ padding: '1rem', color: '#666' }}>Loading...</div>
  }

  return (
    <div style={{ fontSize: '0.875rem' }}>
      {files.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          projectId={projectId}
          onFileSelect={onFileSelect}
          level={0}
        />
      ))}
    </div>
  )
}

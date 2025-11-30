import { useState, useEffect } from 'react'
import { listProjects, createProject, Project } from '../api'

interface Props {
  selectedProject: Project | null
  onSelectProject: (project: Project) => void
}

export function ProjectSelector({ selectedProject, onSelectProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('/tmp')

  useEffect(() => {
    listProjects().then(setProjects)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    const project = await createProject(newName.trim(), newPath)
    setProjects([...projects, project])
    onSelectProject(project)
    setShowCreate(false)
    setNewName('')
  }

  return (
    <div style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontWeight: 500 }}>Project:</label>
        <select
          value={selectedProject?.id || ''}
          onChange={(e) => {
            const project = projects.find((p) => p.id === e.target.value)
            if (project) onSelectProject(project)
          }}
          style={{ flex: 1, padding: '0.25rem' }}
        >
          <option value="">Select a project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            style={{ flex: 1, padding: '0.25rem' }}
          />
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="Base path"
            style={{ width: '150px', padding: '0.25rem' }}
          />
          <button type="submit">Create</button>
        </form>
      )}
    </div>
  )
}

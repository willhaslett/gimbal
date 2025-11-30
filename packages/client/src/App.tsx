import { useState, useCallback } from 'react'
import { Project, FileEntry } from './api'
import { ProjectSelector } from './components/ProjectSelector'
import { FileTree } from './components/FileTree'
import { ChatPanel } from './components/ChatPanel'
import { FileViewer } from './components/FileViewer'

function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [fileTreeKey, setFileTreeKey] = useState(0)

  const refreshFileTree = useCallback(() => {
    setFileTreeKey((k) => k + 1)
  }, [])

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <ProjectSelector
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
      />

      {selectedProject ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar - File Tree */}
          <div
            style={{
              width: '250px',
              borderRight: '1px solid #ddd',
              overflow: 'auto',
              background: '#fafafa',
            }}
          >
            <div
              style={{
                padding: '0.5rem 1rem',
                fontWeight: 500,
                borderBottom: '1px solid #eee',
                fontSize: '0.875rem',
                color: '#666',
              }}
            >
              Files
            </div>
            <FileTree
              key={fileTreeKey}
              projectId={selectedProject.id}
              onFileSelect={setSelectedFile}
            />
          </div>

          {/* Main - Chat Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ChatPanel
              key={selectedProject.id}
              projectId={selectedProject.id}
              onFilesChanged={refreshFileTree}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
          }}
        >
          Select or create a project to get started
        </div>
      )}

      <FileViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
    </div>
  )
}

export default App

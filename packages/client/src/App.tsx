import { useState, useCallback } from 'react'
import { Project, FileEntry } from './api'
import { ProjectList } from './components/ProjectList'
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
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Left Sidebar - Projects with nested Files */}
      <div
        style={{
          width: '260px',
          borderRight: '1px solid #e0e0e0',
          background: '#fafafa',
          overflow: 'hidden',
        }}
      >
        <ProjectList
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          onFileSelect={setSelectedFile}
          fileTreeKey={fileTreeKey}
        />
      </div>

      {/* Main Content - Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedProject ? (
          <ChatPanel
            key={selectedProject.id}
            projectId={selectedProject.id}
            onFilesChanged={refreshFileTree}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
            }}
          >
            Select or create a project to get started
          </div>
        )}
      </div>

      <FileViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
    </div>
  )
}

export default App

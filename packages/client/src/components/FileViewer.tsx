import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileEntry } from '../api'

interface Props {
  file: FileEntry | null
  onClose: () => void
}

export function FileViewer({ file, onClose }: Props) {
  console.log('[FileViewer] render, file:', file?.path, 'content length:', file?.content?.length)
  if (!file) return null

  const isMarkdown = file.path.endsWith('.md')

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '0.5rem',
          width: '80%',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1rem',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 500 }}>{file.path}</span>
          <button onClick={onClose}>Close</button>
        </div>
        {isMarkdown ? (
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflow: 'auto',
              fontSize: '0.9rem',
              lineHeight: 1.6,
            }}
            className="markdown-content"
          >
            <Markdown remarkPlugins={[remarkGfm]}>{file.content || ''}</Markdown>
          </div>
        ) : (
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: '1rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              background: '#f8f8f8',
            }}
          >
            {file.content}
          </pre>
        )}
      </div>
    </div>
  )
}

import { app, BrowserWindow, shell } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { createServer } from 'net'
import { join } from 'path'
import { existsSync } from 'fs'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null
let serverPort: number = 3001

// Find an available port
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(startPort, () => {
      const port = (server.address() as { port: number }).port
      server.close(() => resolve(port))
    })
    server.on('error', () => {
      // Port in use, try next one
      resolve(findAvailablePort(startPort + 1))
    })
  })
}

// Wait for server to be ready
function waitForServer(port: number, maxAttempts = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      attempts++
      fetch(`http://localhost:${port}/api/health`)
        .then((res) => {
          if (res.ok) {
            resolve()
          } else {
            retry()
          }
        })
        .catch(() => retry())
    }
    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Server failed to start'))
      } else {
        setTimeout(check, 200)
      }
    }
    check()
  })
}

// Get the path to resources (different in dev vs packaged)
function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, relativePath)
  }
  // In development, go up to packages directory
  return join(__dirname, '..', '..', relativePath)
}

function isDevMode(): boolean {
  // In packaged app, resources are in app.getPath('exe')/../Resources
  // Check if we're running from a packaged app
  return !app.isPackaged
}

async function startServer(): Promise<void> {
  serverPort = await findAvailablePort(3001)
  console.log(`Starting server on port ${serverPort}`)

  const devMode = isDevMode()

  if (devMode) {
    // Development: use tsx to run TypeScript directly
    const serverSrc = join(__dirname, '..', '..', 'server', 'src', 'index.ts')
    console.log('Dev mode: running', serverSrc)

    serverProcess = spawn('npx', ['tsx', serverSrc], {
      env: {
        ...process.env,
        PORT: String(serverPort),
        // In dev mode, client runs separately on 5173
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      cwd: join(__dirname, '..', '..', 'server'),
    })
  } else {
    // Production: run compiled JS with static client files
    // Server is from pnpm deploy output (has all deps resolved)
    const serverPath = getResourcePath('server')
    const serverEntry = join(serverPath, 'dist', 'index.js')
    const clientPath = getResourcePath('client')

    console.log('Production mode: running', serverEntry)
    console.log('Serving static files from', clientPath)

    // Use system node - user must have Node installed
    serverProcess = spawn('node', [serverEntry], {
      env: {
        ...process.env,
        PORT: String(serverPort),
        STATIC_DIR: clientPath,
        NODE_ENV: 'production',
      },
      cwd: serverPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[server] ${data.toString().trim()}`)
  })

  serverProcess.stderr?.on('data', (data) => {
    console.error(`[server] ${data.toString().trim()}`)
  })

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err)
  })

  serverProcess.on('exit', (code) => {
    console.log(`Server exited with code ${code}`)
    serverProcess = null
  })

  // Wait for server to be healthy
  await waitForServer(serverPort)
  console.log('Server is ready')
}

function createWindow(): void {
  const devMode = isDevMode()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    title: 'Gimbal',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (devMode) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Production: server serves the client, load from same origin
    mainWindow.loadURL(`http://localhost:${serverPort}`)
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost')) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function stopServer(): void {
  if (serverProcess) {
    console.log('Stopping server...')
    serverProcess.kill()
    serverProcess = null
  }
}

app.whenReady().then(async () => {
  try {
    await startServer()
    createWindow()
  } catch (err) {
    console.error('Failed to start:', err)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopServer()
})

app.on('quit', () => {
  stopServer()
})

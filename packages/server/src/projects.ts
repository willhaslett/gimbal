import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { Project, ProjectsConfig } from './types.js'

const GIMBAL_DIR = join(homedir(), '.gimbal')
const PROJECTS_FILE = join(GIMBAL_DIR, 'projects.json')

const DEFAULT_CLAUDE_MD = `# Project

Add project context and instructions for Claude here.
`

async function ensureGimbalDir(): Promise<void> {
  await mkdir(GIMBAL_DIR, { recursive: true })
}

async function loadConfig(): Promise<ProjectsConfig> {
  try {
    const data = await readFile(PROJECTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { projects: [] }
  }
}

async function saveConfig(config: ProjectsConfig): Promise<void> {
  await ensureGimbalDir()
  await writeFile(PROJECTS_FILE, JSON.stringify(config, null, 2))
}

export async function listProjects(): Promise<Project[]> {
  const config = await loadConfig()
  return config.projects
}

export async function createProject(name: string, basePath: string): Promise<Project> {
  const config = await loadConfig()

  const projectPath = join(basePath, name)
  const project: Project = {
    id: randomUUID(),
    name,
    path: projectPath,
    createdAt: new Date().toISOString(),
  }

  // Create directory structure
  await mkdir(projectPath, { recursive: true })
  await mkdir(join(projectPath, 'data'), { recursive: true })
  await mkdir(join(projectPath, 'scripts'), { recursive: true })
  await mkdir(join(projectPath, 'output'), { recursive: true })
  await writeFile(join(projectPath, 'CLAUDE.md'), DEFAULT_CLAUDE_MD)

  config.projects.push(project)
  await saveConfig(config)

  return project
}

export async function getProject(id: string): Promise<Project | undefined> {
  const config = await loadConfig()
  return config.projects.find((p) => p.id === id)
}

export async function deleteProject(id: string): Promise<boolean> {
  const config = await loadConfig()
  const index = config.projects.findIndex((p) => p.id === id)
  if (index === -1) return false

  config.projects.splice(index, 1)
  await saveConfig(config)
  return true
}

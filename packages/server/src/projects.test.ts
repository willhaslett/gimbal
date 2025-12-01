import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, writeFile, rm, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// Test directory that will be set in beforeEach
let testRoot: string

// Mock homedir to return our test directory - use a getter so it's evaluated at call time
vi.mock('os', async () => {
  const actual = await vi.importActual('os')
  return {
    ...actual,
    homedir: () => {
      // Return testRoot if set, otherwise real homedir
      // This is a workaround for the module-level constant evaluation
      return testRoot || (actual as { homedir: () => string }).homedir()
    },
  }
})

describe('projects', () => {
  beforeEach(async () => {
    // Create isolated test directories
    testRoot = join(tmpdir(), `gimbal-projects-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)

    await mkdir(join(testRoot, '.gimbal'), { recursive: true })
    await mkdir(join(testRoot, 'projects'), { recursive: true })

    // Reset modules to pick up new testRoot
    vi.resetModules()
  })

  afterEach(async () => {
    // Clean up test directories
    if (testRoot) {
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  describe('listProjects', () => {
    it('returns empty array when no projects exist', async () => {
      const { listProjects } = await import('./projects.js')
      const projects = await listProjects()
      expect(projects).toEqual([])
    })

    it('returns projects from config file', async () => {
      // Create a project directory
      const projectPath = join(testRoot, 'projects', 'test-project')
      await mkdir(projectPath, { recursive: true })

      // Write projects config
      const config = {
        projects: [
          {
            id: 'proj-123',
            name: 'Test Project',
            path: projectPath,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }
      await writeFile(join(testRoot, '.gimbal', 'projects.json'), JSON.stringify(config))

      const { listProjects } = await import('./projects.js')
      const projects = await listProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({
        id: 'proj-123',
        name: 'Test Project',
        path: projectPath,
      })
    })

    it('filters out projects with non-existent paths', async () => {
      // Write config with a project pointing to non-existent path
      const config = {
        projects: [
          {
            id: 'stale-123',
            name: 'Stale Project',
            path: '/path/that/does/not/exist',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }
      await writeFile(join(testRoot, '.gimbal', 'projects.json'), JSON.stringify(config))

      const { listProjects } = await import('./projects.js')
      const projects = await listProjects()

      expect(projects).toHaveLength(0)
    })

    it('auto-cleans stale projects from config', async () => {
      // Create one valid project directory
      const validPath = join(testRoot, 'projects', 'valid-project')
      await mkdir(validPath, { recursive: true })

      // Write config with both valid and stale projects
      const config = {
        projects: [
          {
            id: 'valid-123',
            name: 'Valid Project',
            path: validPath,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'stale-456',
            name: 'Stale Project',
            path: '/path/that/does/not/exist',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }
      await writeFile(join(testRoot, '.gimbal', 'projects.json'), JSON.stringify(config))

      const { listProjects } = await import('./projects.js')
      await listProjects()

      // Check that config was updated to remove stale project
      const updatedConfig = JSON.parse(
        await readFile(join(testRoot, '.gimbal', 'projects.json'), 'utf-8')
      )
      expect(updatedConfig.projects).toHaveLength(1)
      expect(updatedConfig.projects[0].id).toBe('valid-123')
    })
  })

  describe('createProject', () => {
    it('creates project with correct structure', async () => {
      const { createProject } = await import('./projects.js')
      const baseDir = join(testRoot, 'projects')
      const project = await createProject('my-project', baseDir)

      expect(project.name).toBe('my-project')
      expect(project.path).toBe(join(baseDir, 'my-project'))
      expect(project.id).toBeDefined()
      expect(project.createdAt).toBeDefined()
    })

    it('creates required subdirectories', async () => {
      const { createProject } = await import('./projects.js')
      const { stat } = await import('fs/promises')
      const baseDir = join(testRoot, 'projects')
      const project = await createProject('my-project', baseDir)

      // Check directories exist
      const dataStats = await stat(join(project.path, 'data'))
      const scriptsStats = await stat(join(project.path, 'scripts'))
      const outputStats = await stat(join(project.path, 'output'))

      expect(dataStats.isDirectory()).toBe(true)
      expect(scriptsStats.isDirectory()).toBe(true)
      expect(outputStats.isDirectory()).toBe(true)
    })

    it('creates default CLAUDE.md file', async () => {
      const { createProject } = await import('./projects.js')
      const baseDir = join(testRoot, 'projects')
      const project = await createProject('my-project', baseDir)

      const claudeMd = await readFile(join(project.path, 'CLAUDE.md'), 'utf-8')
      expect(claudeMd).toContain('# Project')
      expect(claudeMd).toContain('Add project context')
    })

    it('saves project to config file', async () => {
      const { createProject } = await import('./projects.js')
      const baseDir = join(testRoot, 'projects')
      const project = await createProject('my-project', baseDir)

      const config = JSON.parse(
        await readFile(join(testRoot, '.gimbal', 'projects.json'), 'utf-8')
      )
      expect(config.projects).toHaveLength(1)
      expect(config.projects[0].id).toBe(project.id)
    })

    it('expands ~ in basePath', async () => {
      const { createProject } = await import('./projects.js')
      // homedir() is mocked to return testRoot
      const project = await createProject('tilde-project', '~/myprojects')

      expect(project.path).toBe(join(testRoot, 'myprojects', 'tilde-project'))
    })
  })

  describe('getProject', () => {
    it('returns project by id', async () => {
      const { createProject, getProject } = await import('./projects.js')
      const baseDir = join(testRoot, 'projects')
      const created = await createProject('find-me', baseDir)

      const found = await getProject(created.id)

      expect(found).toBeDefined()
      expect(found?.name).toBe('find-me')
    })

    it('returns undefined for non-existent id', async () => {
      const { getProject } = await import('./projects.js')
      const found = await getProject('does-not-exist')

      expect(found).toBeUndefined()
    })
  })

  describe('deleteProject', () => {
    it('removes project from config', async () => {
      const { createProject, deleteProject } = await import('./projects.js')
      const baseDir = join(testRoot, 'projects')
      const project = await createProject('to-delete', baseDir)

      const result = await deleteProject(project.id)

      expect(result).toBe(true)

      const config = JSON.parse(
        await readFile(join(testRoot, '.gimbal', 'projects.json'), 'utf-8')
      )
      expect(config.projects).toHaveLength(0)
    })

    it('returns false for non-existent project', async () => {
      const { deleteProject } = await import('./projects.js')
      const result = await deleteProject('does-not-exist')

      expect(result).toBe(false)
    })

    it('does not delete project files from disk', async () => {
      const { createProject, deleteProject } = await import('./projects.js')
      const { stat } = await import('fs/promises')
      const baseDir = join(testRoot, 'projects')
      const project = await createProject('keep-files', baseDir)

      await deleteProject(project.id)

      // Project files should still exist
      const projectStats = await stat(project.path)
      expect(projectStats.isDirectory()).toBe(true)
    })
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  listDirectory,
  readProjectFile,
  writeProjectFile,
  deleteProjectFile,
  createProjectDirectory,
  getFileInfo,
} from './files.js'

describe('files', () => {
  let testDir: string

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `gimbal-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true })
  })

  describe('path traversal protection', () => {
    it('rejects paths with ../ that escape project', async () => {
      await expect(readProjectFile(testDir, '../../../etc/passwd')).rejects.toThrow(
        'Path outside project directory'
      )
    })

    it('rejects absolute paths outside project', async () => {
      await expect(readProjectFile(testDir, '/etc/passwd')).rejects.toThrow(
        'Path outside project directory'
      )
    })

    it('allows ../ that stays within project', async () => {
      // Create nested structure
      await mkdir(join(testDir, 'subdir'), { recursive: true })
      await writeFile(join(testDir, 'test.txt'), 'content')

      // Reading ../test.txt from subdir should work
      const content = await readProjectFile(testDir, 'subdir/../test.txt')
      expect(content).toBe('content')
    })
  })

  describe('listDirectory', () => {
    it('lists files and directories', async () => {
      await mkdir(join(testDir, 'subdir'))
      await writeFile(join(testDir, 'file.txt'), 'content')

      const entries = await listDirectory(testDir)

      expect(entries).toHaveLength(2)
      expect(entries[0]).toMatchObject({ name: 'subdir', type: 'directory' })
      expect(entries[1]).toMatchObject({ name: 'file.txt', type: 'file' })
    })

    it('sorts directories before files', async () => {
      await writeFile(join(testDir, 'aaa.txt'), 'content')
      await mkdir(join(testDir, 'zzz'))

      const entries = await listDirectory(testDir)

      expect(entries[0].name).toBe('zzz')
      expect(entries[1].name).toBe('aaa.txt')
    })

    it('includes file size and modifiedAt for files', async () => {
      await writeFile(join(testDir, 'file.txt'), 'hello')

      const entries = await listDirectory(testDir)

      expect(entries[0].size).toBe(5)
      expect(entries[0].modifiedAt).toBeDefined()
    })
  })

  describe('readProjectFile', () => {
    it('reads file content', async () => {
      await writeFile(join(testDir, 'test.txt'), 'hello world')

      const content = await readProjectFile(testDir, 'test.txt')

      expect(content).toBe('hello world')
    })

    it('throws for non-existent file', async () => {
      await expect(readProjectFile(testDir, 'missing.txt')).rejects.toThrow()
    })
  })

  describe('writeProjectFile', () => {
    it('writes file content', async () => {
      await writeProjectFile(testDir, 'new.txt', 'new content')

      const content = await readProjectFile(testDir, 'new.txt')
      expect(content).toBe('new content')
    })

    it('overwrites existing file', async () => {
      await writeFile(join(testDir, 'existing.txt'), 'old')
      await writeProjectFile(testDir, 'existing.txt', 'new')

      const content = await readProjectFile(testDir, 'existing.txt')
      expect(content).toBe('new')
    })
  })

  describe('deleteProjectFile', () => {
    it('deletes a file', async () => {
      await writeFile(join(testDir, 'todelete.txt'), 'content')
      await deleteProjectFile(testDir, 'todelete.txt')

      await expect(readProjectFile(testDir, 'todelete.txt')).rejects.toThrow()
    })

    it('deletes an empty directory', async () => {
      await mkdir(join(testDir, 'emptydir'))
      await deleteProjectFile(testDir, 'emptydir')

      const entries = await listDirectory(testDir)
      expect(entries.find((e) => e.name === 'emptydir')).toBeUndefined()
    })

    it('throws when deleting non-empty directory', async () => {
      await mkdir(join(testDir, 'nonempty'))
      await writeFile(join(testDir, 'nonempty', 'file.txt'), 'content')

      await expect(deleteProjectFile(testDir, 'nonempty')).rejects.toThrow()
    })
  })

  describe('createProjectDirectory', () => {
    it('creates a directory', async () => {
      await createProjectDirectory(testDir, 'newdir')

      const entries = await listDirectory(testDir)
      expect(entries.find((e) => e.name === 'newdir')).toMatchObject({
        type: 'directory',
      })
    })

    it('creates nested directories', async () => {
      await createProjectDirectory(testDir, 'a/b/c')

      const info = await getFileInfo(testDir, 'a/b/c')
      expect(info.type).toBe('directory')
    })
  })

  describe('getFileInfo', () => {
    it('returns file info', async () => {
      await writeFile(join(testDir, 'info.txt'), 'test')

      const info = await getFileInfo(testDir, 'info.txt')

      expect(info.name).toBe('info.txt')
      expect(info.type).toBe('file')
      expect(info.size).toBe(4)
      expect(info.modifiedAt).toBeDefined()
    })

    it('returns directory info', async () => {
      await mkdir(join(testDir, 'infodir'))

      const info = await getFileInfo(testDir, 'infodir')

      expect(info.name).toBe('infodir')
      expect(info.type).toBe('directory')
      expect(info.size).toBeUndefined()
    })
  })
})

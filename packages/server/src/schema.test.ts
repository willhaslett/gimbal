import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, BASE_SYSTEM_PROMPT } from './schema.js'

describe('buildSystemPrompt', () => {
  it('includes base system prompt', () => {
    const result = buildSystemPrompt('proj-123', 'Test Project', '/path/to/project')
    expect(result).toContain(BASE_SYSTEM_PROMPT)
  })

  it('includes project name and ID', () => {
    const result = buildSystemPrompt('proj-123', 'Test Project', '/path/to/project')
    expect(result).toContain('Test Project')
    expect(result).toContain('proj-123')
  })

  it('includes project path', () => {
    const result = buildSystemPrompt('proj-123', 'Test Project', '/path/to/project')
    expect(result).toContain('/path/to/project')
    expect(result).toContain('paths starting with /path/to/project')
  })

  it('includes CLAUDE.md content when provided', () => {
    const claudeMd = 'Custom instructions for this project'
    const result = buildSystemPrompt('proj-123', 'Test Project', '/path/to/project', claudeMd)
    expect(result).toContain('Project-specific instructions:')
    expect(result).toContain(claudeMd)
  })

  it('does not include CLAUDE.md section when not provided', () => {
    const result = buildSystemPrompt('proj-123', 'Test Project', '/path/to/project')
    expect(result).not.toContain('Project-specific instructions:')
  })

  it('handles undefined CLAUDE.md', () => {
    const result = buildSystemPrompt('proj-123', 'Test Project', '/path/to/project', undefined)
    expect(result).not.toContain('Project-specific instructions:')
  })
})

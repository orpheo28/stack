import { describe, it, expect } from 'vitest'
import { parseGitHubUrl } from '../../src/analyzers/github-repo.js'

describe('parseGitHubUrl', () => {
  it('should parse full https URL', () => {
    const result = parseGitHubUrl('https://github.com/garrytan/gstack')
    expect(result).toEqual({ owner: 'garrytan', repo: 'gstack' })
  })

  it('should parse URL without protocol', () => {
    const result = parseGitHubUrl('github.com/garrytan/gstack')
    expect(result).toEqual({ owner: 'garrytan', repo: 'gstack' })
  })

  it('should parse URL with .git suffix', () => {
    const result = parseGitHubUrl('https://github.com/garrytan/gstack.git')
    expect(result).toEqual({ owner: 'garrytan', repo: 'gstack' })
  })

  it('should parse URL with trailing slash', () => {
    const result = parseGitHubUrl('https://github.com/garrytan/gstack/')
    expect(result).toEqual({ owner: 'garrytan', repo: 'gstack' })
  })

  it('should parse URL with extra path segments (e.g. /tree/main)', () => {
    const result = parseGitHubUrl('https://github.com/garrytan/gstack/tree/main')
    expect(result).toEqual({ owner: 'garrytan', repo: 'gstack' })
  })

  it('should parse http URL', () => {
    const result = parseGitHubUrl('http://github.com/owner/repo')
    expect(result).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('should throw on invalid URL — no repo', () => {
    expect(() => parseGitHubUrl('github.com/onlyowner')).toThrow('STACK_002')
  })

  it('should throw on empty string', () => {
    expect(() => parseGitHubUrl('')).toThrow('STACK_002')
  })

  it('should throw on just a slash', () => {
    expect(() => parseGitHubUrl('/')).toThrow('STACK_002')
  })
})

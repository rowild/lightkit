import { describe, expect, it } from 'vitest'
import { plannedTools, toolForPath, tools } from '../app/data/tools'

describe('toolForPath', () => {
  it('finds the tool a URL belongs to', () => {
    expect(toolForPath('/solar')?.id).toBe('solar')
    expect(toolForPath('/nd')?.id).toBe('nd')
  })

  it('finds no tool on the start page', () => {
    expect(toolForPath('/')).toBeNull()
  })
})

describe('the start page lists', () => {
  it('never show one tool twice', () => {
    const ids = [...tools, ...plannedTools].map(tool => tool.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('give every plate a picture', () => {
    for (const tool of [...tools, ...plannedTools]) {
      expect(tool.art).toMatch(/^\/cards\/.+\.webp$/)
    }
  })
})

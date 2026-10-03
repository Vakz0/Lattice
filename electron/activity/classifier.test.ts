import { describe, expect, it } from 'vitest'
import {
  classify,
  rebuildCompiledPatterns,
  titlePatternFromSample,
} from './classifier'
import { DEFAULT_RULES } from './defaults'

const compiled = rebuildCompiledPatterns(DEFAULT_RULES)

describe('classify', () => {
  it('prioritizes idle as afk', () => {
    const r = classify('chrome', 'YouTube', true, 'youtube.com', DEFAULT_RULES, compiled)
    expect(r.category).toBe('afk')
    expect(r.source).toBe('idle')
  })

  it('prioritizes domain over user app overrides for browsers (non-YouTube)', () => {
    const rules = {
      ...DEFAULT_RULES,
      userAppOverrides: { brave: 'work' as const, chrome: 'work' as const },
    }
    const r = classify('brave', 'Netflix', false, 'netflix.com', rules, compiled)
    expect(r.category).toBe('entertainment')
    expect(r.source).toBe('domain')
  })

  it('still applies user app overrides for non-browser apps over domain', () => {
    const rules = {
      ...DEFAULT_RULES,
      userAppOverrides: { slack: 'work' as const },
    }
    // Slack is not a browser; app override wins even if a domain sneaks in.
    const r = classify('slack', 'channel', false, 'slack.com', rules, compiled)
    expect(r.category).toBe('work')
    expect(r.source).toBe('user')
  })

  it('applies browser app overrides when domain is unknown', () => {
    const rules = {
      ...DEFAULT_RULES,
      userAppOverrides: { brave: 'work' as const },
    }
    const r = classify('brave', 'New Tab', false, null, rules, compiled)
    expect(r.category).toBe('work')
    expect(r.source).toBe('user')
  })

  it('classifies YouTube per video title, defaulting to entertainment', () => {
    const unmarked = classify(
      'chrome',
      'Some lecture - YouTube',
      false,
      'youtube.com',
      DEFAULT_RULES,
      compiled,
    )
    expect(unmarked.category).toBe('entertainment')
    expect(unmarked.source).toBe('domain')

    const rules = {
      ...DEFAULT_RULES,
      titlePatterns: [
        { pattern: 'Some lecture', category: 'studies' as const },
        ...DEFAULT_RULES.titlePatterns,
      ],
    }
    const tagged = classify(
      'chrome',
      'Some lecture - YouTube',
      false,
      'youtube.com',
      rules,
      rebuildCompiledPatterns(rules),
    )
    expect(tagged.category).toBe('studies')
    expect(tagged.source).toBe('title')
  })

  it('uses domain before title patterns (non-YouTube)', () => {
    const r = classify('chrome', 'something', false, 'netflix.com', DEFAULT_RULES, compiled)
    expect(r.category).toBe('entertainment')
    expect(r.source).toBe('domain')
  })

  it('classifies study domains as studies', () => {
    const r = classify('brave', 'Khan', false, 'khanacademy.org', DEFAULT_RULES, compiled)
    expect(r.category).toBe('studies')
    expect(r.source).toBe('domain')
  })

  it('uses title patterns before app defaults', () => {
    const r = classify('unknownapp', 'watching netflix tonight', false, null, DEFAULT_RULES, compiled)
    expect(r.category).toBe('entertainment')
    expect(r.source).toBe('title')
  })

  it('uses app defaults before fallback', () => {
    const r = classify('cursor', 'main.ts — project', false, null, DEFAULT_RULES, compiled)
    expect(r.category).toBe('work')
    expect(r.source).toBe('app')
    expect(r.confidence).toBe('medium')
  })

  it('falls back to other/low', () => {
    const r = classify('weirdapp', 'zzz', false, null, DEFAULT_RULES, compiled)
    expect(r.category).toBe('other')
    expect(r.source).toBe('fallback')
    expect(r.confidence).toBe('low')
  })
})

describe('titlePatternFromSample', () => {
  it('returns null for empty title (blocks title-scope feedback)', () => {
    expect(titlePatternFromSample('')).toBeNull()
    expect(titlePatternFromSample('   ')).toBeNull()
  })

  it('extracts domain-like tokens', () => {
    expect(titlePatternFromSample('https://www.github.com/foo')).toBe('github.com')
  })

  it('extracts text before dash separator', () => {
    const p = titlePatternFromSample('MyDoc — Cursor')
    expect(p).toBeTruthy()
    expect(p!.length).toBeGreaterThanOrEqual(3)
  })
})

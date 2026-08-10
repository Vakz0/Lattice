import { describe, expect, it } from 'vitest'
import type { ActivitySegment } from '../../shared/types'
import { buildSummary, buildTransitions } from './aggregator'
import { rebuildCompiledPatterns } from './classifier'
import { DEFAULT_RULES, DEFAULT_SETTINGS } from './defaults'

function seg(partial: Partial<ActivitySegment> & Pick<ActivitySegment, 'app' | 'category'>): ActivitySegment {
  return {
    start: '2026-07-31T10:00:00.000Z',
    end: '2026-07-31T10:01:00.000Z',
    title: null,
    categorySource: 'app',
    matchedPattern: null,
    idleSec: 0,
    prevApp: null,
    sessionId: null,
    exeDir: null,
    titleHash: null,
    confidence: 'medium',
    domain: null,
    urlPath: null,
    contextKind: null,
    fileName: null,
    projectName: null,
    ignored: false,
    ...partial,
  }
}

const deps = {
  settings: { ...DEFAULT_SETTINGS },
  running: true,
  rules: DEFAULT_RULES,
  compiledTitlePatterns: rebuildCompiledPatterns(DEFAULT_RULES),
  userDomainOverrides: null,
  countFeedbackOnDay: () => 0,
  getTopWatch: () => [],
  getFocusSession: () => null,
  isMediaKeepAwakeActive: () => false,
  isActiveUrlHelperAvailable: () => false,
}

describe('buildSummary', () => {
  it('aggregates countable time and skips ignored/afk from total', () => {
    const segments = [
      seg({ app: 'cursor', category: 'work' }),
      seg({
        app: 'afk',
        category: 'afk',
        start: '2026-07-31T10:01:00.000Z',
        end: '2026-07-31T10:02:00.000Z',
      }),
      seg({
        app: 'lattice',
        category: 'system',
        ignored: true,
        start: '2026-07-31T10:02:00.000Z',
        end: '2026-07-31T10:03:00.000Z',
      }),
    ]
    const summary = buildSummary('2026-07-31', segments, null, deps)
    expect(summary.totalMs).toBe(60_000)
    expect(summary.byCategory.work).toBe(60_000)
    expect(summary.byCategory.afk).toBe(60_000)
    expect(summary.topApps[0]?.app).toBe('cursor')
    expect(summary.manualAfk).toBe(false)
  })

  it('attributes browser+domain time to topSites, not topApps', () => {
    const segments = [
      seg({
        app: 'brave',
        category: 'entertainment',
        domain: 'youtube.com',
        contextKind: 'browser',
        categorySource: 'domain',
      }),
      seg({
        app: 'brave',
        category: 'other',
        domain: null,
        contextKind: 'browser',
        start: '2026-07-31T10:01:00.000Z',
        end: '2026-07-31T10:02:00.000Z',
      }),
    ]
    const summary = buildSummary('2026-07-31', segments, null, deps)
    expect(summary.byCategory.entertainment).toBe(60_000)
    expect(summary.topSites[0]).toEqual({
      domain: 'youtube.com',
      ms: 60_000,
      category: 'entertainment',
    })
    expect(summary.topApps.map((a) => a.app)).toEqual(['brave'])
    expect(summary.topApps[0]?.ms).toBe(60_000)
  })

  it('applies current rules over stored segment categories', () => {
    const rules = {
      ...DEFAULT_RULES,
      userAppOverrides: { notepad: 'studies' as const },
      appDefaults: { ...DEFAULT_RULES.appDefaults, notepad: 'studies' as const },
    }
    const segments = [
      seg({
        app: 'notepad',
        category: 'other',
        categorySource: 'fallback',
        confidence: 'low',
      }),
    ]
    const summary = buildSummary('2026-07-31', segments, null, {
      ...deps,
      rules,
      compiledTitlePatterns: rebuildCompiledPatterns(rules),
    })
    expect(summary.byCategory.studies).toBe(60_000)
    expect(summary.byCategory.other).toBe(0)
    expect(summary.topApps[0]?.category).toBe('studies')
  })

  it('classifies study domains in topSites', () => {
    const segments = [
      seg({
        app: 'brave',
        category: 'work',
        domain: 'khanacademy.org',
        contextKind: 'browser',
        categorySource: 'user',
      }),
    ]
    const summary = buildSummary('2026-07-31', segments, null, deps)
    expect(summary.byCategory.studies).toBe(60_000)
    expect(summary.topSites[0]?.category).toBe('studies')
  })
})

describe('buildTransitions', () => {
  it('counts prevApp → app edges', () => {
    const segments = [
      seg({ app: 'chrome', category: 'work', prevApp: 'cursor' }),
      seg({ app: 'chrome', category: 'work', prevApp: 'cursor' }),
      seg({ app: 'slack', category: 'communication', prevApp: 'chrome' }),
    ]
    const t = buildTransitions(segments)
    expect(t[0]).toEqual({ from: 'cursor', to: 'chrome', count: 2 })
  })
})

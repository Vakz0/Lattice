import type {
  ActivityAppBreakdown,
  ActivityCategory,
  ActivityConfidence,
  ActivityCurrentFocus,
  ActivityDaySummary,
  ActivityProjectBreakdown,
  ActivityQualityMetrics,
  ActivityRules,
  ActivitySegment,
  ActivitySettings,
  ActivitySiteBreakdown,
  ActivityTaskBreakdown,
  FocusSession,
} from '../../shared/types'
import { isSearchEngineDomain } from '../../shared/searchEngines'
import { isYoutubeHost } from '../../shared/youtubeVideo'
import {
  classify,
  type CompiledTitlePattern,
} from './classifier'
import { resolveCategory } from './categories'
import { BROWSER_APPS } from './context'
import { todayKey } from './paths'
import {
  emptyByCategory,
  segmentMs,
} from './segmentUtils'

const SYSTEM_APP_BUCKET = 'Système'

export type SummaryDeps = {
  settings: ActivitySettings
  running: boolean
  rules: ActivityRules
  compiledTitlePatterns: CompiledTitlePattern[]
  userDomainOverrides?: Record<string, ActivityCategory> | null
  countFeedbackOnDay: (date: string) => number
  getTopWatch: (
    date: string,
    limit: number,
    overrides?: Record<string, ActivityCategory> | null,
  ) => ActivitySiteBreakdown[]
  getFocusSession: () => FocusSession | null
  isMediaKeepAwakeActive: () => boolean
  isActiveUrlHelperAvailable: () => boolean
}

/** Live category from current rules (afk / ignored keep stored values). */
export function effectiveSegmentCategory(
  seg: ActivitySegment,
  rules: ActivityRules,
  compiled: CompiledTitlePattern[],
): {
  category: ActivityCategory
  confidence: ActivityConfidence
  source: NonNullable<ActivitySegment['categorySource']>
  matchedPattern: string | null
} {
  if (seg.category === 'afk' || seg.ignored) {
    return {
      category: seg.category,
      confidence: seg.confidence ?? 'high',
      source: seg.categorySource ?? (seg.category === 'afk' ? 'idle' : 'app'),
      matchedPattern: seg.matchedPattern ?? null,
    }
  }
  const r = classify(
    seg.app,
    seg.title ?? null,
    false,
    seg.domain ?? null,
    rules,
    compiled,
  )
  return {
    category: resolveCategory(r.category, rules),
    confidence: r.confidence,
    source: r.source,
    matchedPattern: r.matchedPattern,
  }
}

export function buildQuality(
  segments: ActivitySegment[],
  date: string,
  countFeedbackOnDay: (date: string) => number,
  rules: ActivityRules,
  compiled: CompiledTitlePattern[],
): ActivityQualityMetrics {
  let activeMs = 0
  let otherMs = 0
  let lowMs = 0
  const unknown = new Set<string>()

  for (const seg of segments) {
    const ms = segmentMs(seg)
    if (ms <= 0 || seg.ignored || seg.category === 'afk') continue
    if (isSearchEngineDomain(seg.domain)) continue
    const eff = effectiveSegmentCategory(seg, rules, compiled)
    if (eff.category === 'afk') continue
    activeMs += ms
    if (eff.category === 'other') otherMs += ms
    if (eff.confidence === 'low') lowMs += ms
    if (
      seg.app === 'unknown' ||
      seg.app.startsWith('pid-') ||
      (eff.category === 'other' && eff.source === 'fallback')
    ) {
      unknown.add(seg.app)
    }
  }

  return {
    otherShare: activeMs > 0 ? otherMs / activeMs : 0,
    lowConfidenceShare: activeMs > 0 ? lowMs / activeMs : 0,
    unknownAppCount: unknown.size,
    feedbackCountToday: countFeedbackOnDay(date),
  }
}

export function buildCurrent(
  live: ActivitySegment | null,
  rules?: ActivityRules,
  compiled?: CompiledTitlePattern[],
): ActivityCurrentFocus | null {
  if (!live || live.category === 'afk') return null
  const eff =
    rules && compiled
      ? effectiveSegmentCategory(live, rules, compiled)
      : {
          category: live.category,
          confidence: live.confidence ?? 'medium',
          source: live.categorySource ?? 'fallback',
          matchedPattern: live.matchedPattern ?? null,
        }
  if (eff.category === 'afk') return null
  return {
    app: live.app,
    title: live.title,
    category: eff.category,
    confidence: eff.confidence,
    categorySource: eff.source,
    domain: live.domain ?? null,
    fileName: live.fileName ?? null,
    projectName: live.projectName ?? null,
    contextKind: live.contextKind ?? null,
    ignored: Boolean(live.ignored),
  }
}

export function buildSummary(
  date: string,
  daySegments: ActivitySegment[],
  live: ActivitySegment | null | undefined,
  deps: SummaryDeps,
): ActivityDaySummary {
  // Copy so pushing `live` does not mutate the day cache.
  const segments = [...daySegments]
  if (live && todayKey(new Date(live.start)) === date) {
    segments.push(live)
  }

  const byCategory = emptyByCategory(deps.rules.customCategories)
  const appMs = new Map<
    string,
    {
      ms: number
      category: ActivityCategory
      confidence: ActivityConfidence
      showCategory: boolean
    }
  >()
  const siteMs = new Map<
    string,
    {
      ms: number
      category: ActivityCategory
      label?: string
      correctionScope?: ActivitySiteBreakdown['correctionScope']
      correctionTitle?: string | null
      showCategory: boolean
    }
  >()
  const projectMs = new Map<string, number>()
  const taskMs = new Map<string, { title: string; ms: number }>()
  let totalMs = 0

  for (const seg of segments) {
    const ms = segmentMs(seg)
    if (ms <= 0) continue
    const eff = effectiveSegmentCategory(
      seg,
      deps.rules,
      deps.compiledTitlePatterns,
    )
    if (eff.category === 'afk' || seg.category === 'afk') {
      byCategory.afk += ms
      continue
    }
    if (seg.ignored) continue
    // Search engines: not counted in active time / tops.
    if (isSearchEngineDomain(seg.domain)) continue

    totalMs += ms
    byCategory[eff.category] = (byCategory[eff.category] ?? 0) + ms

    // Always attribute to the app (browsers = full cumulative, including tab time).
    {
      const isBrowser = BROWSER_APPS.has(seg.app)
      const appKey =
        eff.category === 'system' && !isBrowser ? SYSTEM_APP_BUCKET : seg.app
      const showCategory = !isBrowser && appKey !== SYSTEM_APP_BUCKET
      const prev = appMs.get(appKey) ?? {
        ms: 0,
        category: eff.category === 'system' ? 'system' : eff.category,
        confidence: eff.confidence,
        showCategory,
      }
      prev.ms += ms
      if (showCategory) {
        prev.category = eff.category
        prev.confidence = eff.confidence
      }
      prev.showCategory = showCategory
      appMs.set(appKey, prev)
    }

    if (seg.domain) {
      if (isYoutubeHost(seg.domain)) {
        // One aggregated « youtube » row — no per-video label, no category UI.
        const bucket = 'youtube.com'
        const prev = siteMs.get(bucket) ?? {
          ms: 0,
          category: eff.category,
          label: 'youtube',
          showCategory: false,
        }
        prev.ms += ms
        prev.label = 'youtube'
        prev.showCategory = false
        // Keep a title-rule category if we already have one; otherwise follow latest.
        if (eff.source === 'title' || prev.category === 'entertainment') {
          prev.category = eff.category
        }
        siteMs.set(bucket, prev)
      } else {
        const prev = siteMs.get(seg.domain) ?? {
          ms: 0,
          category: eff.category,
          correctionScope: 'domain' as const,
          showCategory: true,
        }
        prev.ms += ms
        prev.category = eff.category
        prev.showCategory = true
        siteMs.set(seg.domain, prev)
      }
    }
    if (seg.projectName) {
      projectMs.set(seg.projectName, (projectMs.get(seg.projectName) ?? 0) + ms)
    }
    if (seg.notionTaskId) {
      const t = taskMs.get(seg.notionTaskId) ?? {
        title: seg.notionTaskTitle || 'Sans titre',
        ms: 0,
      }
      t.ms += ms
      if (seg.notionTaskTitle) t.title = seg.notionTaskTitle
      taskMs.set(seg.notionTaskId, t)
    }
  }

  const topApps: ActivityAppBreakdown[] = [...appMs.entries()]
    .map(([appName, v]) => ({
      app: appName,
      ms: v.ms,
      category: v.category,
      confidence: v.confidence,
      showCategory: v.showCategory,
    }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)

  const topSites: ActivitySiteBreakdown[] = [...siteMs.entries()]
    .map(([domain, v]) => ({
      domain,
      ms: v.ms,
      category: v.category,
      label: v.label,
      correctionScope: v.correctionScope,
      correctionTitle: v.correctionTitle,
      showCategory: v.showCategory,
    }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)

  const topProjects: ActivityProjectBreakdown[] = [...projectMs.entries()]
    .map(([projectName, ms]) => ({ projectName, ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)

  const topTasks: ActivityTaskBreakdown[] = [...taskMs.entries()]
    .map(([notionTaskId, v]) => ({
      notionTaskId,
      title: v.title,
      ms: v.ms,
    }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)

  const topWatch = deps.getTopWatch(date, 8, deps.userDomainOverrides)

  return {
    date,
    totalMs,
    byCategory,
    topApps,
    topSites,
    topProjects,
    paused: deps.settings.paused,
    tracking: deps.running && !deps.settings.paused,
    quality: buildQuality(
      segments,
      date,
      deps.countFeedbackOnDay,
      deps.rules,
      deps.compiledTitlePatterns,
    ),
    current: buildCurrent(live ?? null, deps.rules, deps.compiledTitlePatterns),
    urlHelperAvailable: deps.isActiveUrlHelperAvailable(),
    mediaKeepAwake: deps.isMediaKeepAwakeActive(),
    manualAfk: deps.settings.manualAfk,
    topWatch,
    focusSession: deps.getFocusSession(),
    topTasks,
  }
}

export function withPendingCurrent(
  summary: ActivityDaySummary,
  pending: ActivitySegment | null,
  rules?: ActivityRules,
  compiled?: CompiledTitlePattern[],
): ActivityDaySummary {
  if (!pending) return summary
  return {
    ...summary,
    current: buildCurrent(
      {
        ...pending,
        end: new Date().toISOString(),
      },
      rules,
      compiled,
    ),
  }
}

export function buildTransitions(
  segments: ActivitySegment[],
): { from: string; to: string; count: number }[] {
  const map = new Map<string, number>()
  for (const seg of segments) {
    if (!seg.prevApp || seg.prevApp === seg.app || seg.category === 'afk') continue
    const key = `${seg.prevApp}\t${seg.app}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('\t')
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count)
}

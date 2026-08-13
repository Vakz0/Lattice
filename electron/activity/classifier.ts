import type {
  ActivityCategory,
  ActivityCategorySource,
  ActivityConfidence,
  ActivityRules,
} from '../../shared/types'
import { isYoutubeHost } from '../../shared/youtubeVideo'
import { BROWSER_APPS, categoryFromDomain } from './context'
import { normalizeAppKey } from './normalize'

export type ClassifyResult = {
  category: ActivityCategory
  source: ActivityCategorySource
  matchedPattern: string | null
  confidence: ActivityConfidence
}

export type CompiledTitlePattern = {
  re: RegExp
  category: ActivityCategory
  pattern: string
}

function escapeRegexToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function rebuildCompiledPatterns(rules: ActivityRules): CompiledTitlePattern[] {
  const out: CompiledTitlePattern[] = []
  for (const rule of rules.titlePatterns) {
    try {
      // Patterns are matched literally (escaped) to avoid ReDoS / injection from rules files.
      out.push({
        re: new RegExp(escapeRegexToken(rule.pattern), 'i'),
        category: rule.category,
        pattern: rule.pattern,
      })
    } catch (err) {
      console.debug('compileTitlePatterns: skip invalid pattern', err)
    }
  }
  return out
}

export function classify(
  app: string,
  title: string | null,
  idle: boolean,
  domain: string | null,
  rules: ActivityRules,
  compiledTitlePatterns: CompiledTitlePattern[],
): ClassifyResult {
  if (idle) {
    return {
      category: 'afk',
      source: 'idle',
      matchedPattern: null,
      confidence: 'high',
    }
  }

  const key = normalizeAppKey(app)
  const titleLower = (title ?? '').toLowerCase()
  const isBrowser = BROWSER_APPS.has(key)
  // YouTube is classified per video (title rules), never as a single domain bucket.
  const youtube = isYoutubeHost(domain)

  const fromDomain = youtube
    ? null
    : categoryFromDomain(domain, rules.userDomainOverrides)

  // Title patterns first for YouTube so each video can be work / studies / entertainment.
  if (youtube) {
    for (const rule of compiledTitlePatterns) {
      if (rule.re.test(titleLower)) {
        return {
          category: rule.category,
          source: 'title',
          matchedPattern: rule.pattern,
          confidence: 'high',
        }
      }
    }
    return {
      category: 'other',
      source: 'fallback',
      matchedPattern: null,
      confidence: 'low',
    }
  }

  // Browsers: site domain must win over an app override on chrome/brave/…
  if (isBrowser && fromDomain) {
    return {
      category: fromDomain.category,
      source: rules.userDomainOverrides?.[fromDomain.matched] ? 'user' : 'domain',
      matchedPattern: fromDomain.matched,
      confidence: 'high',
    }
  }

  const userHit = rules.userAppOverrides?.[key]
  if (userHit) {
    return {
      category: userHit,
      source: 'user',
      matchedPattern: null,
      confidence: 'high',
    }
  }

  if (fromDomain) {
    return {
      category: fromDomain.category,
      source: rules.userDomainOverrides?.[fromDomain.matched] ? 'user' : 'domain',
      matchedPattern: fromDomain.matched,
      confidence: 'high',
    }
  }

  for (const rule of compiledTitlePatterns) {
    if (rule.re.test(titleLower)) {
      return {
        category: rule.category,
        source: 'title',
        matchedPattern: rule.pattern,
        confidence: 'high',
      }
    }
  }

  const fromApp = rules.appDefaults[key]
  if (fromApp) {
    return {
      category: fromApp,
      source: 'app',
      matchedPattern: null,
      confidence: 'medium',
    }
  }

  return {
    category: 'other',
    source: 'fallback',
    matchedPattern: null,
    confidence: 'low',
  }
}

/** Extract a stable token from a title for a title-scope rule (domain-like or significant word). */
export function titlePatternFromSample(titleSample: string): string | null {
  const trimmed = titleSample.trim()
  if (!trimmed) return null
  // Prefer full YouTube video title (without " - YouTube") so one video ≠ whole site.
  const ytClean = trimmed
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*[-—–]\s*YouTube\s*$/i, '')
    .replace(
      /\s(?:—|–|-)\s(?:Google Chrome|Microsoft Edge|Brave|Mozilla Firefox|Opera|Vivaldi|Arc)$/i,
      '',
    )
    .trim()
  if (
    /youtube/i.test(trimmed) &&
    ytClean.length >= 3 &&
    ytClean.length <= 120 &&
    !/^youtube$/i.test(ytClean)
  ) {
    return ytClean.slice(0, 120)
  }
  const domain = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z]{2,})+)/i,
  )
  // Return raw tokens; rebuildCompiledPatterns escapes before new RegExp.
  if (domain?.[1]) return domain[1].toLowerCase()
  const beforeDash = trimmed.split(/\s[-–—|]\s/)[0]?.trim()
  if (beforeDash && beforeDash.length >= 3 && beforeDash.length <= 48) {
    return beforeDash.slice(0, 48)
  }
  const word = trimmed.match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 ._-]{2,31}/)
  return word ? word[0].trim() : null
}

export function isIgnoredApp(appKey: string, rules: ActivityRules, defaultIgnored: string[]): boolean {
  const list = rules.ignoredApps ?? defaultIgnored
  return list.some((name) => normalizeAppKey(name) === appKey)
}

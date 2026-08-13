import type {
  ActivityCategory,
  ActivityCustomCategory,
  ActivitySegment,
} from '../../shared/types'
import { BUILTIN_CATEGORIES } from '../../shared/types'

export function emptyByCategory(
  customCategories?: ActivityCustomCategory[] | null,
): Record<ActivityCategory, number> {
  const out: Record<ActivityCategory, number> = {}
  for (const id of BUILTIN_CATEGORIES) {
    out[id] = 0
  }
  for (const cat of customCategories ?? []) {
    if (cat.id) out[cat.id] = 0
  }
  return out
}

export function segmentMs(s: ActivitySegment): number {
  return Math.max(0, new Date(s.end).getTime() - new Date(s.start).getTime())
}

export function isCountable(seg: ActivitySegment): boolean {
  return seg.category !== 'afk' && !seg.ignored
}

export function shouldPersistSegment(seg: ActivitySegment): boolean {
  return !seg.ignored || segmentMs(seg) >= 1_000
}

export function sameFocus(a: ActivitySegment, b: ActivitySegment): boolean {
  return (
    a.app === b.app &&
    a.title === b.title &&
    a.category === b.category &&
    Boolean(a.ignored) === Boolean(b.ignored) &&
    (a.titleHash ?? null) === (b.titleHash ?? null) &&
    (a.domain ?? null) === (b.domain ?? null) &&
    (a.fileName ?? null) === (b.fileName ?? null) &&
    (a.projectName ?? null) === (b.projectName ?? null)
  )
}

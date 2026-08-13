import type {
  ActivityCategory,
  ActivityCustomCategory,
  ActivityDaySummary,
} from '../../vite-env'
import { shiftDate, todayKey } from '../../../shared/dates'
import { errMessage } from '../../../shared/errors'

export { todayKey, shiftDate, errMessage }

export const BUILTIN_CATEGORY_ORDER: ActivityCategory[] = [
  'work',
  'studies',
  'entertainment',
  'communication',
  'system',
  'other',
  'afk',
]

export const BUILTIN_CATEGORY_LABELS: Record<string, string> = {
  work: 'Travail',
  studies: 'Études',
  entertainment: 'Divertissement',
  communication: 'Communication',
  system: 'Système',
  other: 'Autre',
  afk: 'AFK',
}

export const BUILTIN_CATEGORY_COLORS: Record<string, string> = {
  work: '#6fbf8f',
  studies: '#7a9bb8',
  entertainment: '#d4a35c',
  communication: '#6fa8d4',
  system: '#8a8a88',
  other: '#9b7dba',
  afk: 'rgba(255, 255, 255, 0.28)',
}

/** @deprecated Prefer buildCategoryMeta — kept for legacy snapshot imports. */
export const CATEGORY_ORDER = BUILTIN_CATEGORY_ORDER
/** @deprecated Prefer buildCategoryMeta */
export const EDITABLE_CATEGORIES = BUILTIN_CATEGORY_ORDER.filter((c) => c !== 'afk')
/** @deprecated Prefer buildCategoryMeta */
export const CATEGORY_LABELS = BUILTIN_CATEGORY_LABELS

export type CategoryOption = {
  id: ActivityCategory
  label: string
  color: string
  builtin: boolean
  /** False for fallback `other` (and afk, which is not listed). */
  deletable: boolean
}

export type CategoryMeta = {
  order: ActivityCategory[]
  editable: ActivityCategory[]
  labels: Record<string, string>
  colors: Record<string, string>
  options: CategoryOption[]
  custom: ActivityCustomCategory[]
}

export function buildCategoryMeta(
  customCategories: ActivityCustomCategory[] | null | undefined,
  opts?: {
    overrides?: Record<string, { label?: string; color?: string }> | null
    disabled?: string[] | null
  },
): CategoryMeta {
  const custom = customCategories ?? []
  const overrides = opts?.overrides ?? {}
  const disabled = new Set(opts?.disabled ?? [])
  const labels: Record<string, string> = { ...BUILTIN_CATEGORY_LABELS }
  const colors: Record<string, string> = { ...BUILTIN_CATEGORY_COLORS }
  const options: CategoryOption[] = []

  for (const id of BUILTIN_CATEGORY_ORDER) {
    if (id === 'afk') continue
    if (disabled.has(id)) continue
    const ov = overrides[id]
    if (ov?.label) labels[id] = ov.label
    if (ov?.color) colors[id] = ov.color
    options.push({
      id,
      label: labels[id] ?? id,
      color: colors[id] ?? '#9b7dba',
      builtin: true,
      deletable: id !== 'other',
    })
  }

  for (const cat of custom) {
    if (disabled.has(cat.id)) continue
    const ov = overrides[cat.id]
    const label = ov?.label ?? cat.label
    const color = ov?.color ?? cat.color
    labels[cat.id] = label
    colors[cat.id] = color
    options.push({
      id: cat.id,
      label,
      color,
      builtin: false,
      deletable: true,
    })
  }

  // Keep labels/colors for disabled/afk for historical display in summaries.
  for (const [id, ov] of Object.entries(overrides)) {
    if (ov.label) labels[id] = ov.label
    if (ov.color) colors[id] = ov.color
  }

  const order = [
    ...BUILTIN_CATEGORY_ORDER.filter((c) => c !== 'afk' && !disabled.has(c)),
    ...custom.map((c) => c.id).filter((id) => !disabled.has(id)),
    'afk',
  ]

  return {
    order,
    editable: options.map((o) => o.id),
    labels,
    colors,
    options,
    custom,
  }
}

export function categoryLabel(
  id: ActivityCategory,
  meta: CategoryMeta,
): string {
  return meta.labels[id] ?? id
}

export function categoryColor(
  id: ActivityCategory,
  meta: CategoryMeta,
): string {
  return meta.colors[id] ?? '#9b7dba'
}

export const AFK_PRESETS = [
  { sec: 60, label: '1 min' },
  { sec: 120, label: '2 min' },
  { sec: 180, label: '3 min' },
  { sec: 300, label: '5 min' },
  { sec: 600, label: '10 min' },
] as const

export const DEFAULT_NEW_CATEGORY_COLOR = '#4f8f6a'

export function formatDayTitle(date: string, today: string): string {
  if (date === today) return 'Aujourd’hui'
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export function formatShortDuration(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMin = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h${String(m).padStart(2, '0')}`
}

export function emptySummary(date = todayKey()): ActivityDaySummary {
  return {
    date,
    totalMs: 0,
    byCategory: {
      work: 0,
      studies: 0,
      entertainment: 0,
      communication: 0,
      system: 0,
      other: 0,
      afk: 0,
    },
    topApps: [],
    topSites: [],
    topProjects: [],
    paused: false,
    tracking: false,
    quality: {
      otherShare: 0,
      lowConfidenceShare: 0,
      unknownAppCount: 0,
      feedbackCountToday: 0,
    },
    current: null,
    urlHelperAvailable: true,
    mediaKeepAwake: false,
    manualAfk: false,
    topWatch: [],
    focusSession: null,
    topTasks: [],
  }
}

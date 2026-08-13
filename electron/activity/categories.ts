import type {
  ActivityCategory,
  ActivityCategoryMutationResult,
  ActivityCustomCategory,
  ActivityDaySummary,
  ActivityRules,
} from '../../shared/types'
import { BUILTIN_CATEGORIES } from '../../shared/types'
import { getOpenSegment, getPendingSwitch } from './poll'
import { classify } from './classifier'
import { todayKey } from './paths'
import {
  getCompiledTitlePatterns,
  getRules,
  loadActivityState,
  reclassifyAndRewriteDaySegments,
  saveRules,
  setRules,
} from './storage'

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/
const MAX_CUSTOM_CATEGORIES = 24
const MAX_LABEL_LEN = 32
/** Categories that cannot be deleted (fallback + system). */
const UNDELETABLE = new Set(['afk', 'other'])

const BUILTIN_DEFAULT_LABELS: Record<string, string> = {
  work: 'Travail',
  studies: 'Études',
  entertainment: 'Divertissement',
  communication: 'Communication',
  system: 'Système',
  other: 'Autre',
  afk: 'AFK',
}

const BUILTIN_DEFAULT_COLORS: Record<string, string> = {
  work: '#6fbf8f',
  studies: '#7a9bb8',
  entertainment: '#d4a35c',
  communication: '#6fa8d4',
  system: '#8a8a88',
  other: '#9b7dba',
  afk: '#8a8a88',
}

type CategoryHooks = {
  emitSummary: () => void | Promise<void>
  getActivitySummary: () => ActivityDaySummary | Promise<ActivityDaySummary>
  getLastSummary: () => ActivityDaySummary | null
}

let hooks: CategoryHooks | null = null

export function setCategoryHooks(next: CategoryHooks): void {
  hooks = next
}

function requireHooks(): CategoryHooks {
  if (!hooks) {
    throw new Error('Activity category hooks not initialized')
  }
  return hooks
}

async function resultSummary(h: CategoryHooks): Promise<ActivityDaySummary> {
  return h.getLastSummary() ?? (await h.getActivitySummary())
}

function applyLiveClassification(): void {
  const open = getOpenSegment()
  if (open && open.category !== 'afk' && !open.ignored) {
    const r = classify(
      open.app,
      open.title ?? null,
      false,
      open.domain ?? null,
      getRules(),
      getCompiledTitlePatterns(),
    )
    open.category = resolveCategory(r.category, getRules())
    open.categorySource = r.source
    open.confidence = r.confidence
    open.matchedPattern = r.matchedPattern
  }
  const pending = getPendingSwitch()?.segment
  if (pending && pending.category !== 'afk' && !pending.ignored) {
    const r = classify(
      pending.app,
      pending.title ?? null,
      false,
      pending.domain ?? null,
      getRules(),
      getCompiledTitlePatterns(),
    )
    pending.category = resolveCategory(r.category, getRules())
    pending.categorySource = r.source
    pending.confidence = r.confidence
    pending.matchedPattern = r.matchedPattern
  }
}

export function isDisabledCategory(
  category: string,
  rules: ActivityRules = getRules(),
): boolean {
  return (rules.disabledCategories ?? []).includes(category)
}

/** Map disabled categories to `other` (afk untouched). */
export function resolveCategory(
  category: ActivityCategory,
  rules: ActivityRules = getRules(),
): ActivityCategory {
  if (category === 'afk') return 'afk'
  if (isDisabledCategory(category, rules)) return 'other'
  return category
}

export function isKnownCategory(
  category: string,
  rules: ActivityRules = getRules(),
): boolean {
  if (!category) return false
  if (category === 'afk') return true
  if (isDisabledCategory(category, rules)) return false
  if ((BUILTIN_CATEGORIES as readonly string[]).includes(category)) return true
  return (rules.customCategories ?? []).some((c) => c.id === category)
}

export function isEditableCategory(
  category: string,
  rules: ActivityRules = getRules(),
): boolean {
  return category !== 'afk' && isKnownCategory(category, rules)
}

/** Slugify a label into a stable category id (ascii, kebab-ish). */
export function slugifyCategoryId(label: string): string {
  const base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'category'
}

function reservedIds(rules: ActivityRules): Set<string> {
  const set = new Set<string>(BUILTIN_CATEGORIES as readonly string[])
  for (const c of rules.customCategories ?? []) {
    set.add(c.id)
  }
  return set
}

function uniqueCategoryId(label: string, rules: ActivityRules): string {
  const reserved = reservedIds(rules)
  const base = slugifyCategoryId(label)
  if (!reserved.has(base)) return base
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`
    if (!reserved.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

function normalizeColor(color: string): string | null {
  const trimmed = color.trim()
  if (!HEX_COLOR_RE.test(trimmed)) return null
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

function remapCategoryInRules(rules: ActivityRules, fromId: string, toId: ActivityCategory): ActivityRules {
  const remapRecord = (
    rec: Record<string, ActivityCategory> | undefined,
  ): Record<string, ActivityCategory> | undefined => {
    if (!rec) return rec
    const next: Record<string, ActivityCategory> = {}
    for (const [k, v] of Object.entries(rec)) {
      next[k] = v === fromId ? toId : v
    }
    return next
  }
  return {
    ...rules,
    appDefaults: remapRecord(rules.appDefaults) ?? {},
    userAppOverrides: remapRecord(rules.userAppOverrides),
    userDomainOverrides: remapRecord(rules.userDomainOverrides),
    titlePatterns: rules.titlePatterns.map((p) =>
      p.category === fromId ? { ...p, category: toId } : p,
    ),
  }
}

function applyOverridePatch(
  rules: ActivityRules,
  id: string,
  label: string,
  color: string,
): ActivityRules {
  const overrides = { ...(rules.categoryOverrides ?? {}) }
  overrides[id] = { label, color }
  return { ...rules, categoryOverrides: overrides }
}

export async function addActivityCategory(payload: {
  label: string
  color: string
}): Promise<ActivityCategoryMutationResult> {
  await loadActivityState()
  const h = requireHooks()
  const label = (payload.label ?? '').trim().slice(0, MAX_LABEL_LEN)
  if (label.length < 1) {
    return { ok: false, message: 'Nom de catégorie requis.' }
  }
  const color = normalizeColor(payload.color ?? '')
  if (!color) {
    return { ok: false, message: 'Couleur invalide (hex attendu, ex. #4f8f6a).' }
  }

  let rules = getRules()
  const customs = [...(rules.customCategories ?? [])]
  if (customs.length >= MAX_CUSTOM_CATEGORIES) {
    return { ok: false, message: `Maximum ${MAX_CUSTOM_CATEGORIES} catégories personnalisées.` }
  }

  // Re-enable a previously disabled builtin if the slug matches.
  const candidateId = slugifyCategoryId(label)
  const disabled = new Set(rules.disabledCategories ?? [])
  if (
    disabled.has(candidateId) &&
    (BUILTIN_CATEGORIES as readonly string[]).includes(candidateId)
  ) {
    rules = {
      ...rules,
      disabledCategories: (rules.disabledCategories ?? []).filter((x) => x !== candidateId),
      categoryOverrides: {
        ...(rules.categoryOverrides ?? {}),
        [candidateId]: { label, color },
      },
    }
    setRules(rules)
    await saveRules()
    applyLiveClassification()
    await reclassifyAndRewriteDaySegments(todayKey())
    await h.emitSummary()
    return {
      ok: true,
      message: `Catégorie « ${label} » rétablie.`,
      rules: structuredClone(getRules()),
      summary: await resultSummary(h),
    }
  }

  const id = uniqueCategoryId(label, rules)
  const entry: ActivityCustomCategory = { id, label, color }
  rules = {
    ...rules,
    customCategories: [...customs, entry],
  }
  setRules(rules)
  await saveRules()
  await h.emitSummary()
  return {
    ok: true,
    message: `Catégorie « ${label} » ajoutée.`,
    rules: structuredClone(getRules()),
    summary: await resultSummary(h),
  }
}

export async function updateActivityCategory(payload: {
  id: string
  label?: string
  color?: string
}): Promise<ActivityCategoryMutationResult> {
  await loadActivityState()
  const h = requireHooks()
  const id = (payload.id ?? '').trim()
  if (!id) return { ok: false, message: 'Identifiant manquant.' }
  if (id === 'afk') {
    return { ok: false, message: 'La catégorie AFK ne peut pas être modifiée.' }
  }
  if (isDisabledCategory(id)) {
    return { ok: false, message: 'Catégorie désactivée.' }
  }

  let rules = getRules()
  const isBuiltin = (BUILTIN_CATEGORIES as readonly string[]).includes(id)
  const customs = [...(rules.customCategories ?? [])]
  const idx = customs.findIndex((c) => c.id === id)

  if (!isBuiltin && idx < 0) {
    return { ok: false, message: 'Catégorie introuvable.' }
  }

  const currentOverride = rules.categoryOverrides?.[id]
  const currentCustom = idx >= 0 ? customs[idx] : null
  let label =
    currentCustom?.label ??
    currentOverride?.label ??
    BUILTIN_DEFAULT_LABELS[id] ??
    id
  let color =
    currentCustom?.color ??
    currentOverride?.color ??
    BUILTIN_DEFAULT_COLORS[id] ??
    '#9b7dba'

  if (typeof payload.label === 'string') {
    const nextLabel = payload.label.trim().slice(0, MAX_LABEL_LEN)
    if (nextLabel.length < 1) {
      return { ok: false, message: 'Nom de catégorie requis.' }
    }
    label = nextLabel
  }
  if (typeof payload.color === 'string') {
    const nextColor = normalizeColor(payload.color)
    if (!nextColor) {
      return { ok: false, message: 'Couleur invalide (hex attendu, ex. #4f8f6a).' }
    }
    color = nextColor
  }

  if (isBuiltin) {
    rules = applyOverridePatch(rules, id, label, color)
  } else {
    customs[idx] = { id, label, color }
    rules = applyOverridePatch(
      { ...rules, customCategories: customs },
      id,
      label,
      color,
    )
  }

  setRules(rules)
  await saveRules()
  await h.emitSummary()
  return {
    ok: true,
    message: `Catégorie « ${label} » mise à jour.`,
    rules: structuredClone(getRules()),
    summary: await resultSummary(h),
  }
}

export async function deleteActivityCategory(payload: {
  id: string
}): Promise<ActivityCategoryMutationResult> {
  await loadActivityState()
  const h = requireHooks()
  const id = (payload.id ?? '').trim()
  if (!id) return { ok: false, message: 'Identifiant manquant.' }
  if (UNDELETABLE.has(id)) {
    return {
      ok: false,
      message:
        id === 'afk'
          ? 'La catégorie AFK ne peut pas être supprimée.'
          : 'La catégorie Autre ne peut pas être supprimée (fallback).',
    }
  }

  let rules = getRules()
  const isBuiltin = (BUILTIN_CATEGORIES as readonly string[]).includes(id)
  const customs = rules.customCategories ?? []
  const isCustom = customs.some((c) => c.id === id)

  if (!isBuiltin && !isCustom) {
    return { ok: false, message: 'Catégorie introuvable.' }
  }
  if (isDisabledCategory(id, rules)) {
    return { ok: false, message: 'Catégorie déjà désactivée.' }
  }

  rules = remapCategoryInRules(rules, id, 'other')
  const overrides = { ...(rules.categoryOverrides ?? {}) }
  delete overrides[id]

  if (isCustom) {
    rules = {
      ...rules,
      customCategories: customs.filter((c) => c.id !== id),
      categoryOverrides: overrides,
    }
  } else {
    const disabled = new Set(rules.disabledCategories ?? [])
    disabled.add(id)
    rules = {
      ...rules,
      categoryOverrides: overrides,
      disabledCategories: [...disabled],
    }
  }

  setRules(rules)
  await saveRules()
  applyLiveClassification()
  await reclassifyAndRewriteDaySegments(todayKey())
  await h.emitSummary()
  return {
    ok: true,
    message: `Catégorie « ${id} » supprimée (segments → Autre).`,
    rules: structuredClone(getRules()),
    summary: await resultSummary(h),
  }
}

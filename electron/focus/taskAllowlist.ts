/**
 * Allowlists focus persistées par tâche Notion (local only).
 */
import fsp from 'node:fs/promises'
import type { FocusAllowlist } from '../../shared/types'
import { sanitizeFocusAllowlist } from '../activity/focusAllowlist'
import {
  activityDir,
  assertWithin,
  focusTaskAllowlistsPath,
} from '../activity/paths'
import { ensureFocusDirs } from './persist'

type Store = Record<string, FocusAllowlist>

async function readStore(): Promise<Store> {
  ensureFocusDirs()
  const file = assertWithin(activityDir(), focusTaskAllowlistsPath())
  try {
    const raw = JSON.parse(await fsp.readFile(file, 'utf8')) as unknown
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: Store = {}
    for (const [taskId, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!taskId || !value || typeof value !== 'object') continue
      out[taskId] = sanitizeFocusAllowlist(value as Partial<FocusAllowlist>)
    }
    return out
  } catch {
    return {}
  }
}

async function writeStore(store: Store): Promise<void> {
  ensureFocusDirs()
  const file = assertWithin(activityDir(), focusTaskAllowlistsPath())
  await fsp.writeFile(file, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
}

export async function getTaskFocusAllowlist(
  notionTaskId: string,
): Promise<FocusAllowlist | null> {
  const id = notionTaskId.trim()
  if (!id) return null
  const store = await readStore()
  return store[id] ?? null
}

export async function setTaskFocusAllowlist(
  notionTaskId: string,
  allowlist: FocusAllowlist,
): Promise<FocusAllowlist> {
  const id = notionTaskId.trim()
  const next = sanitizeFocusAllowlist(allowlist)
  const store = await readStore()
  store[id] = next
  await writeStore(store)
  return next
}

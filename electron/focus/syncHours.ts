import { closeOpenSegment } from '../activity/poll'
import { readDaySegments } from '../activity/storage'
import { segmentMs, isCountable } from '../activity/segmentUtils'
import { todayKey } from '../activity/paths'
import { shiftDate } from '../../shared/dates'
import { addTaskHours, roundHours } from '../notion'
import type { AppConfig, FocusSession, NotionTask } from '../../shared/types'

/** Seuil minimum pour pousser une sync focus (~1 minute). */
const MIN_SYNC_HOURS = 1 / 60

export async function sumFocusSessionMs(focusSessionId: string): Promise<number> {
  const today = todayKey()
  const days = [today, shiftDate(today, -1)]
  let total = 0
  for (const day of days) {
    for (const seg of await readDaySegments(day)) {
      if (seg.focusSessionId !== focusSessionId || !isCountable(seg)) continue
      total += segmentMs(seg)
    }
  }
  return total
}

export async function syncFocusSessionHours(opts: {
  config: AppConfig
  session: FocusSession
  getTasksCache: () => NotionTask[]
  refreshNotion: (force?: boolean) => Promise<NotionTask[]>
  setTasksCache: (tasks: NotionTask[]) => void
  sendTasksUpdated: (tasks: NotionTask[]) => void
}): Promise<void> {
  await closeOpenSegment()
  const hours = roundHours((await sumFocusSessionMs(opts.session.id)) / 3_600_000)
  if (hours < MIN_SYNC_HOURS) return

  let cached = opts.getTasksCache().find((t) => t.id === opts.session.notionTaskId)
  if (!cached) {
    await opts.refreshNotion(true)
    cached = opts.getTasksCache().find((t) => t.id === opts.session.notionTaskId)
  }
  if (!cached) {
    console.warn('Focus hours sync: task not in cache', opts.session.notionTaskId)
    return
  }

  const result = await addTaskHours(
    opts.config,
    {
      pageId: opts.session.notionTaskId,
      databaseId: opts.session.databaseId || cached.databaseId,
      hours,
    },
    cached,
  )
  if (!result.ok || !result.task) {
    console.error('Focus hours sync failed', result.message)
    return
  }

  const cache = opts.getTasksCache()
  const updated = result.task
  const next = cache.some((t) => t.id === updated.id)
    ? cache.map((t) => (t.id === updated.id ? updated : t))
    : [...cache, updated]
  opts.setTasksCache(next)
  opts.sendTasksUpdated(next)
}

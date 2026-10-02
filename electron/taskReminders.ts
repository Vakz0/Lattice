import type { NotionTask } from '../shared/types'
import { shiftDate, todayKey } from '../shared/dates'
import { showLatticeNotification } from './notify'

const HORIZON_DAYS = 2 // today + tomorrow + day after

function dayLabel(iso: string, today: string): string {
  if (iso < today) return 'En retard'
  if (iso === today) return "Aujourd'hui"
  if (iso === shiftDate(today, 1)) return 'Demain'
  if (iso === shiftDate(today, 2)) return 'Après-demain'
  return iso
}

/** Tâches ouvertes à rappeler : en retard + J → J+2. */
export function getReminderTasks(tasks: NotionTask[], now = new Date()): NotionTask[] {
  const today = todayKey(now)
  const until = shiftDate(today, HORIZON_DAYS)
  return tasks
    .filter((t) => !t.done && t.date && t.date <= until)
    .sort((a, b) => {
      const da = a.date ?? ''
      const db = b.date ?? ''
      if (da !== db) return da.localeCompare(db)
      return a.title.localeCompare(b.title, 'fr')
    })
}

function formatDigestBody(tasks: NotionTask[], now = new Date()): string {
  const today = todayKey(now)
  const lines: string[] = []
  let currentLabel = ''
  for (const task of tasks) {
    const date = task.date!
    const label = dayLabel(date, today)
    if (label !== currentLabel) {
      currentLabel = label
      lines.push(`${label} :`)
    }
    const title = task.title.length > 48 ? `${task.title.slice(0, 45)}…` : task.title
    lines.push(`· ${title}`)
  }
  const body = lines.join('\n')
  return body.length <= 240 ? body : `${body.slice(0, 220).trim()}…`
}

/** Affiche une notif Windows du digest, ou rien s’il n’y a aucune tâche. */
export function showUpcomingTasksDigest(tasks: NotionTask[]): boolean {
  const upcoming = getReminderTasks(tasks)
  if (!upcoming.length) return false
  const count = upcoming.length
  showLatticeNotification({
    title: count === 1 ? '1 tâche à venir' : `${count} tâches à venir`,
    body: formatDigestBody(upcoming),
  })
  return true
}

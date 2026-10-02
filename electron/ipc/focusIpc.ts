import { ipcMain } from 'electron'
import { getActivityFocusSeed, refreshActivitySummary } from '../activity'
import { mergeFocusAllowlists } from '../activity/focusAllowlist'
import {
  ensureFocusSessionLoaded,
  getFocusJournal,
  getFocusSession,
  getPendingFocusInterrupt,
  pauseFocusSession,
  resolveFocusInterrupt,
  resumeFocusSession,
  startFocusSession,
  stopFocusSession,
  updateFocusAllowlist,
} from '../focus'
import { syncFocusSessionHours } from '../focus/syncHours'
import type {
  FocusAllowlist,
  FocusSession,
  ResolveFocusInterruptPayload,
  StartFocusSessionPayload,
} from '../../shared/types'
import type { IpcDeps } from './types'

function maybeSyncFocusHours(deps: IpcDeps, session: FocusSession | null): void {
  if (!session || !deps.hasService('notion')) return
  void syncFocusSessionHours({
    config: deps.getConfig(),
    session,
    getTasksCache: deps.getTasksCache,
    refreshNotion: deps.refreshNotion,
    setTasksCache: deps.setTasksCache,
    sendTasksUpdated: (tasks) => {
      deps.sendTo(deps.notionWidgetIds(), 'tasks-updated', tasks)
    },
  }).catch((err) => {
    console.error('Failed to sync focus hours to Notion', err)
  })
}

export function registerFocusIpc(deps: IpcDeps): void {
  ipcMain.handle('start-focus-session', async (_e, payload: StartFocusSessionPayload) => {
    if (!deps.hasService('activity-tracker')) {
      return { ok: false, message: 'Activez le widget Activité.' }
    }
    const seed = getActivityFocusSeed()
    const result = await startFocusSession({
      ...payload,
      seedAllowlist: mergeFocusAllowlists(seed, payload?.seedAllowlist),
    })
    if (result.ok) refreshActivitySummary()
    return result
  })
  ipcMain.handle('stop-focus-session', async () => {
    const session = await stopFocusSession()
    deps.hideFocusInterruptWindow()
    refreshActivitySummary()
    maybeSyncFocusHours(deps, session)
    return session
  })
  ipcMain.handle('pause-focus-session', async () => {
    const session = await pauseFocusSession()
    deps.hideFocusInterruptWindow()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('resume-focus-session', async () => {
    const session = await resumeFocusSession()
    refreshActivitySummary()
    return session
  })
  ipcMain.handle('get-focus-session', async () => {
    await ensureFocusSessionLoaded()
    return getFocusSession()
  })
  ipcMain.handle('update-focus-allowlist', async (_e, patch: Partial<FocusAllowlist>) => {
    const session = await updateFocusAllowlist(patch ?? {})
    refreshActivitySummary()
    return session
  })
  ipcMain.handle(
    'resolve-focus-interrupt',
    async (_e, payload: ResolveFocusInterruptPayload) => {
      const result = await resolveFocusInterrupt(payload ?? { action: 'resume' })
      if (result.ok) {
        deps.hideFocusInterruptWindow()
        refreshActivitySummary()
        if (payload?.action === 'stop') {
          maybeSyncFocusHours(deps, result.session)
        }
      }
      return result
    },
  )
  ipcMain.handle('get-focus-journal', (_e, date?: string) => getFocusJournal(date))
  ipcMain.handle('get-pending-focus-interrupt', () => getPendingFocusInterrupt())
  ipcMain.handle('hide-focus-interrupt', () => {
    deps.hideFocusInterruptWindow()
  })
}

import { ipcMain } from 'electron'
import type { IpcDeps } from './types'

export function registerWidgetWindowIpc(deps: IpcDeps): void {
  // Minimize and close both just hide the frameless window; power mode is
  // re-applied by the window's own 'hide' listener (see createWidgetWindow.ts).
  const hide = (_e: unknown, id: string) => {
    if (typeof id !== 'string' || !id) return
    deps.hideWidget(id)
  }
  ipcMain.handle('minimize-widget-window', hide)
  ipcMain.handle('close-widget-window', hide)
}

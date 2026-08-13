import { ipcRenderer } from 'electron'

export function createWidgetWindowApi() {
  return {
    minimizeWidgetWindow: (id: string): Promise<void> =>
      ipcRenderer.invoke('minimize-widget-window', id),
    closeWidgetWindow: (id: string): Promise<void> =>
      ipcRenderer.invoke('close-widget-window', id),
  }
}

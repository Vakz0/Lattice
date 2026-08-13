import { ipcRenderer } from 'electron'
import type { CatalogWidgetInfo } from '../../shared/types'

export function createCatalogApi() {
  return {
    listWidgets: (): Promise<CatalogWidgetInfo[]> => ipcRenderer.invoke('list-widgets'),
    setWidgetEnabled: (
      id: string,
      enabled: boolean,
    ): Promise<{ ok: boolean; widgets: CatalogWidgetInfo[] }> =>
      ipcRenderer.invoke('set-widget-enabled', id, enabled),
    openCatalog: (opts?: { view?: 'catalog' | 'settings' }): Promise<void> =>
      ipcRenderer.invoke('open-catalog', opts),
    closeCatalog: (): Promise<void> => ipcRenderer.invoke('close-catalog'),
    minimizeCatalog: (): Promise<void> => ipcRenderer.invoke('minimize-catalog'),
    toggleMaximizeCatalog: (): Promise<boolean> =>
      ipcRenderer.invoke('toggle-maximize-catalog'),
    isCatalogMaximized: (): Promise<boolean> => ipcRenderer.invoke('is-catalog-maximized'),
  }
}

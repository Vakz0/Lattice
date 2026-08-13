import { contextBridge } from 'electron'
import { createActivityApi } from './preload/activityApi'
import { createCatalogApi } from './preload/catalogApi'
import { createConfigApi, createShellApi } from './preload/configApi'
import { createEventsApi } from './preload/eventsApi'
import { createTasksApi } from './preload/tasksApi'
import { createUpdatesApi } from './preload/updatesApi'
import { createWidgetWindowApi } from './preload/widgetWindowApi'

const api = {
  ...createTasksApi(),
  ...createConfigApi(),
  ...createCatalogApi(),
  ...createShellApi(),
  ...createActivityApi(),
  ...createUpdatesApi(),
  ...createEventsApi(),
  ...createWidgetWindowApi(),
}

contextBridge.exposeInMainWorld('lattice', api)

export type LatticeApi = typeof api

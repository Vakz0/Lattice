import {
  IconClose,
  IconMinimize,
  IconSettings,
} from './catalog/CatalogIcons'

function IconLatticeMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.95" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.7" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.7" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.95" />
    </svg>
  )
}

// The window's query string never changes during its lifetime, so this is
// resolved once per renderer load rather than re-parsed on every render.
const currentWidgetId: string = new URLSearchParams(window.location.search).get('widget') ?? 'activity'

/** Frameless window chrome: brand + settings / minimize / close. */
export function WidgetTitlebar() {
  const id = currentWidgetId

  return (
    <header className="widget-titlebar drag-region">
      <div className="widget-titlebar-brand">
        <span className="widget-titlebar-mark" aria-hidden>
          <IconLatticeMark />
        </span>
        <span className="widget-titlebar-label">Lattice</span>
      </div>
      <div className="widget-titlebar-controls no-drag">
        <button
          type="button"
          className="widget-titlebar-btn"
          aria-label="Paramètres"
          title="Paramètres"
          onClick={() => void window.lattice.openCatalog({ view: 'settings' })}
        >
          <IconSettings />
        </button>
        <button
          type="button"
          className="widget-titlebar-btn"
          aria-label="Réduire"
          title="Réduire"
          onClick={() => void window.lattice.minimizeWidgetWindow(id)}
        >
          <IconMinimize />
        </button>
        <button
          type="button"
          className="widget-titlebar-btn widget-titlebar-btn-close"
          aria-label="Fermer"
          title="Fermer"
          onClick={() => void window.lattice.closeWidgetWindow(id)}
        >
          <IconClose />
        </button>
      </div>
    </header>
  )
}

import { useState } from 'react'

type ActivityOptionsFooterProps = {
  busy: boolean
  optionsOpen: boolean
  confirmClear: boolean
  hint: string | null
  hintError: boolean
  onOpenOptions: () => void
  onExport: (format: 'csv' | 'json') => void
  onOpenRules: () => void
  onClear: () => void
  onCancelClear: () => void
}

/** Slim footer — status by default; actions behind ⋯. */
export function ActivityOptionsFooter({
  busy,
  optionsOpen,
  confirmClear,
  hint,
  hintError,
  onOpenOptions,
  onExport,
  onOpenRules,
  onClear,
  onCancelClear,
}: ActivityOptionsFooterProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <footer className="activity-footer no-drag">
      {menuOpen && !optionsOpen ? (
        <div className="activity-actions">
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => {
              setMenuOpen(false)
              onOpenOptions()
            }}
          >
            Options
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => void onExport('csv')}
          >
            CSV
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={() => void onExport('json')}
          >
            JSON
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={onOpenRules}
          >
            Règles…
          </button>
          {confirmClear ? (
            <>
              <button
                type="button"
                className="activity-btn activity-btn-danger"
                disabled={busy}
                onClick={() => void onClear()}
              >
                Confirmer
              </button>
              <button
                type="button"
                className="activity-btn activity-btn-ghost"
                disabled={busy}
                onClick={onCancelClear}
              >
                Annuler
              </button>
            </>
          ) : (
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy}
              onClick={() => void onClear()}
              title="Effacer l’historique et le feedback (conserve les règles)"
            >
              Effacer…
            </button>
          )}
        </div>
      ) : null}

      <div className="activity-footer-status">
        {hint ? (
          <div className={`activity-hint${hintError ? ' is-error' : ''}`}>{hint}</div>
        ) : (
          <div className="activity-footer-live">
            Données mises à jour à l’instant
            <span className="activity-footer-dot" aria-hidden />
          </div>
        )}
        {!optionsOpen ? (
          <button
            type="button"
            className="activity-footer-menu"
            disabled={busy}
            aria-label={menuOpen ? 'Masquer les actions' : 'Afficher les actions'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ⋯
          </button>
        ) : null}
      </div>
    </footer>
  )
}

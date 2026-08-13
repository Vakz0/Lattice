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

/** Slim footer actions — options live on ActivityOptionsPage. */
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
  return (
    <footer className="activity-footer no-drag">
      <div className="activity-actions">
        {!optionsOpen ? (
          <button
            type="button"
            className="activity-btn activity-btn-ghost"
            disabled={busy}
            onClick={onOpenOptions}
          >
            Options
          </button>
        ) : null}
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

      {hint ? (
        <div className={`activity-hint${hintError ? ' is-error' : ''}`}>{hint}</div>
      ) : null}
    </footer>
  )
}

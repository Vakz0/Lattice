import type {
  ActivityCategory,
  ActivityCorrectionScope,
  ActivityDaySummary,
} from '../../vite-env'
import { CATEGORY_LABELS, EDITABLE_CATEGORIES } from './format'

function contextLine(current: NonNullable<ActivityDaySummary['current']>): string | null {
  // When the primary label is already the domain, show the browser as secondary.
  if (current.domain && current.contextKind === 'browser') {
    return current.app
  }
  if (current.domain) return current.domain
  if (current.projectName && current.fileName) {
    return `${current.fileName} · ${current.projectName}`
  }
  if (current.projectName) return current.projectName
  if (current.fileName) return current.fileName
  return null
}

function primaryLabel(current: NonNullable<ActivityDaySummary['current']>): string {
  if (current.ignored) return 'Lattice'
  if (current.contextKind === 'browser' && current.domain) return current.domain
  return current.app
}

type ActivityNowCardProps = {
  current: NonNullable<ActivityDaySummary['current']>
  busy: boolean
  onCorrect: (
    app: string,
    category: ActivityCategory,
    scope: ActivityCorrectionScope,
    titleSample?: string | null,
    domain?: string | null,
  ) => void
}

export function ActivityNowCard({ current, busy, onCorrect }: ActivityNowCardProps) {
  return (
    <section className="activity-now" aria-label="Maintenant">
      <div className="activity-section-title">Maintenant</div>
      <div className="activity-now-card">
        <div className="activity-now-main">
          <span className="activity-now-app" title={primaryLabel(current)}>
            {primaryLabel(current)}
          </span>
          {current.ignored ? (
            <span className="activity-now-context">
              Widgets Lattice — non comptés
            </span>
          ) : (
            (() => {
              const line = contextLine(current)
              if (line) {
                return (
                  <span className="activity-now-context" title={line}>
                    {line}
                  </span>
                )
              }
              if (current.title) {
                return (
                  <span className="activity-now-title" title={current.title}>
                    {current.title}
                  </span>
                )
              }
              return null
            })()
          )}
        </div>
        {!current.ignored ? (
          <>
            <label className="activity-correct">
              <span className="activity-correct-label">Catégorie</span>
              <select
                className="activity-select"
                disabled={busy}
                value={current.category}
                onChange={(e) => {
                  const next = e.target.value as ActivityCategory
                  if (current.domain) {
                    void onCorrect(current.app, next, 'domain', current.title, current.domain)
                  } else {
                    void onCorrect(current.app, next, 'app', current.title)
                  }
                }}
              >
                {EDITABLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            {current.domain ? (
              <button
                type="button"
                className="activity-btn activity-btn-ghost activity-btn-tiny"
                disabled={busy}
                title="Créer une règle pour ce domaine"
                onClick={() => {
                  void onCorrect(
                    current.app,
                    current.category === 'other' ? 'work' : current.category,
                    'domain',
                    current.title,
                    current.domain,
                  )
                }}
              >
                Règle domaine
              </button>
            ) : current.title ? (
              <button
                type="button"
                className="activity-btn activity-btn-ghost activity-btn-tiny"
                disabled={busy}
                title="Créer une règle basée sur le titre"
                onClick={() => {
                  void onCorrect(
                    current.app,
                    current.category === 'other' ? 'work' : current.category,
                    'title',
                    current.title,
                  )
                }}
              >
                Règle titre
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}

import type {
  ActivityCategory,
  ActivityCorrectionScope,
  ActivityDaySummary,
} from '../../vite-env'
import { categoryPillStyle, resolveCategoryOption, type CategoryOption } from './format'

function primaryLabel(current: NonNullable<ActivityDaySummary['current']>): string {
  if (current.ignored) return 'Lattice'
  if (current.contextKind === 'browser' && current.domain) {
    // Prefer video title over "youtube.com"
    if (current.title) {
      const cleaned = current.title
        .replace(/^\(\d+\)\s*/, '')
        .replace(/\s*[-—–]\s*YouTube\s*$/i, '')
        .replace(
          /\s(?:—|–|-)\s(?:Google Chrome|Microsoft Edge|Brave|Mozilla Firefox|Opera|Vivaldi|Arc)$/i,
          '',
        )
        .trim()
      if (
        /youtube\.com|youtu\.be/i.test(current.domain) &&
        cleaned &&
        !/^youtube$/i.test(cleaned)
      ) {
        return cleaned
      }
    }
    return current.domain
  }
  return current.app
}

function contextLine(current: NonNullable<ActivityDaySummary['current']>): string | null {
  if (current.domain && current.contextKind === 'browser') {
    // When primary is the video title, show YouTube as secondary.
    if (/youtube\.com|youtu\.be/i.test(current.domain) && current.title) {
      return 'YouTube'
    }
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

/** Secondary line under the app/domain name: domain/project context, else the raw window title. */
function nowSecondaryLine(current: NonNullable<ActivityDaySummary['current']>) {
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
}

type ActivityNowCardProps = {
  current: NonNullable<ActivityDaySummary['current']>
  busy: boolean
  categoryOptions: CategoryOption[]
  onCorrect: (
    app: string,
    category: ActivityCategory,
    scope: ActivityCorrectionScope,
    titleSample?: string | null,
    domain?: string | null,
  ) => void
}

export function ActivityNowCard({
  current,
  busy,
  categoryOptions,
  onCorrect,
}: ActivityNowCardProps) {
  const { selectValue, selected } = resolveCategoryOption(categoryOptions, current.category)

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
            nowSecondaryLine(current)
          )}
        </div>
        {!current.ignored ? (
          <>
            <label className="activity-correct activity-correct-pill">
              <span className="activity-correct-label">Catégorie</span>
              <select
                className="activity-select activity-select-pill"
                disabled={busy}
                value={selectValue}
                style={selected ? categoryPillStyle(selected.color) : undefined}
                onChange={(e) => {
                  const next = e.target.value as ActivityCategory
                  if (
                    /youtube\.com|youtu\.be/i.test(current.domain ?? '') ||
                    /youtube/i.test(current.title ?? '')
                  ) {
                    void onCorrect(current.app, next, 'title', current.title, current.domain)
                  } else if (current.domain) {
                    void onCorrect(current.app, next, 'domain', current.title, current.domain)
                  } else {
                    void onCorrect(current.app, next, 'app', current.title)
                  }
                }}
              >
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
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

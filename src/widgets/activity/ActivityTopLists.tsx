import type {
  ActivityCategory,
  ActivityCorrectionScope,
  ActivityDaySummary,
} from '../../vite-env'
import { CategorySelect } from './CategorySelect'
import {
  categoryColor,
  categoryLabel,
  formatShortDuration,
  type CategoryMeta,
  type CategoryOption,
} from './format'

type ActivityTopListsProps = {
  data: ActivityDaySummary
  busy: boolean
  categoryMeta: CategoryMeta
  categoryOptions: CategoryOption[]
  /** Filtre sur apps / sites / visionnage (null = tout). */
  categoryFilter: ActivityCategory | null
  onCorrect: (
    app: string,
    category: ActivityCategory,
    scope: ActivityCorrectionScope,
    titleSample?: string | null,
    domain?: string | null,
  ) => void
  onMenuOpenChange: (open: boolean) => void
}

export function ActivityTopLists({
  data,
  busy,
  categoryMeta,
  categoryOptions,
  categoryFilter,
  onCorrect,
  onMenuOpenChange,
}: ActivityTopListsProps) {
  const topTasks = data.topTasks ?? []
  const topApps = categoryFilter
    ? data.topApps.filter((row) => row.category === categoryFilter)
    : data.topApps
  const topSites = categoryFilter
    ? data.topSites.filter((row) => row.category === categoryFilter)
    : data.topSites
  const topWatch = categoryFilter
    ? data.topWatch.filter((row) => row.category === categoryFilter)
    : data.topWatch

  return (
    <div className="activity-tops-grid">
      <section className="activity-apps activity-card" aria-label="Applications">
        <div className="activity-section-head">
          <div className="activity-section-title">Top apps</div>
          <div className="activity-section-meta">Temps actif</div>
        </div>
        {topApps.length === 0 ? (
          <div className="activity-empty">
            {categoryFilter
              ? 'Aucune app dans cette catégorie.'
              : data.paused
                ? 'Suivi en pause — reprenez pour collecter des données.'
                : 'En attente d’activité…'}
          </div>
        ) : (
          <ul className="activity-app-list">
            {topApps.map((appRow) => {
              const showCat = appRow.showCategory !== false
              return (
                <li
                  key={appRow.app}
                  className={`activity-app-row${showCat ? '' : ' activity-app-row-simple'}`}
                >
                  <span className="activity-app-name" title={appRow.app}>
                    {appRow.app}
                  </span>
                  {showCat ? (
                    <CategorySelect
                      className="activity-select activity-select-compact activity-select-pill"
                      disabled={busy}
                      value={appRow.category}
                      options={categoryOptions}
                      ariaLabel={`Catégorie ${appRow.app}`}
                      onMenuOpenChange={onMenuOpenChange}
                      onChange={(next) => void onCorrect(appRow.app, next, 'app')}
                    />
                  ) : null}
                  <span className="activity-app-time">
                    {formatShortDuration(appRow.ms)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {topSites.length > 0 || (categoryFilter && data.topSites.length > 0) ? (
        <section className="activity-apps activity-card" aria-label="Sites">
          <div className="activity-section-head">
            <div className="activity-section-title">Top sites</div>
            <div className="activity-section-meta">Temps actif</div>
          </div>
          {topSites.length === 0 ? (
            <div className="activity-empty">Aucun site dans cette catégorie.</div>
          ) : (
            <ul className="activity-app-list">
              {topSites.map((site) => {
                const showCat = site.showCategory !== false
                return (
                  <li
                    key={site.domain}
                    className={`activity-app-row${showCat ? '' : ' activity-app-row-simple'}`}
                  >
                    <span
                      className="activity-app-name"
                      title={site.label ?? site.domain}
                    >
                      {site.label ?? site.domain}
                    </span>
                    {showCat ? (
                      <CategorySelect
                        className="activity-select activity-select-compact activity-select-pill"
                        disabled={busy}
                        value={site.category}
                        options={categoryOptions}
                        ariaLabel={`Catégorie ${site.label ?? site.domain}`}
                        onMenuOpenChange={onMenuOpenChange}
                        onChange={(next) => {
                          const scope = site.correctionScope ?? 'domain'
                          void onCorrect(
                            data.current?.app ?? 'browser',
                            next,
                            scope,
                            site.correctionTitle ?? site.label ?? null,
                            scope === 'domain' ? site.domain : null,
                          )
                        }}
                      />
                    ) : null}
                    <span className="activity-app-time">
                      {formatShortDuration(site.ms)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}

      {topWatch.length > 0 || (categoryFilter && data.topWatch.length > 0) ? (
        <section className="activity-apps activity-card" aria-label="Visionnage">
          <div className="activity-section-title">Visionnage</div>
          {topWatch.length === 0 ? (
            <div className="activity-empty">Aucun visionnage dans cette catégorie.</div>
          ) : (
            <ul className="activity-app-list">
              {topWatch.map((site) => (
                <li
                  key={site.domain}
                  className="activity-app-row activity-app-row-simple"
                >
                  <span
                    className="activity-app-name"
                    title={site.label ?? site.domain}
                  >
                    {site.label ?? site.domain}
                  </span>
                  {site.showCategory !== false ? (
                    <span className="activity-app-cat">
                      <span
                        className="activity-cat-dot"
                        style={{
                          background: categoryColor(site.category, categoryMeta),
                        }}
                        aria-hidden
                      />
                      {categoryLabel(site.category, categoryMeta)}
                    </span>
                  ) : null}
                  <span className="activity-app-time">
                    {formatShortDuration(site.ms)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!categoryFilter && (data.topProjects?.length ?? 0) > 0 ? (
        <section className="activity-apps activity-card" aria-label="Projets">
          <div className="activity-section-title">Top projets</div>
          <ul className="activity-app-list">
            {data.topProjects.map((proj) => (
              <li
                key={proj.projectName}
                className="activity-app-row activity-app-row-simple"
              >
                <span className="activity-app-name" title={proj.projectName}>
                  {proj.projectName}
                </span>
                <span className="activity-app-time">
                  {formatShortDuration(proj.ms)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!categoryFilter && topTasks.length > 0 ? (
        <section className="activity-apps activity-card" aria-label="Tâches Notion">
          <div className="activity-section-title">Temps par tâche</div>
          <ul className="activity-app-list">
            {topTasks.map((task) => (
              <li
                key={task.notionTaskId}
                className="activity-app-row activity-app-row-simple"
              >
                <span className="activity-app-name" title={task.title}>
                  {task.title}
                </span>
                <span className="activity-app-time">
                  {formatShortDuration(task.ms)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

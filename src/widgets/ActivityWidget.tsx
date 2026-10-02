import { useState } from 'react'
import type { ActivityCategory } from '../vite-env'
import { ActivityCategoryRing } from './activity/ActivityCategoryRing'
import { ActivityFocusJournal } from './activity/ActivityFocusJournal'
import { ActivityFocusPanel } from './activity/ActivityFocusPanel'
import { ActivityNowCard } from './activity/ActivityNowCard'
import { ActivityOptionsFooter } from './activity/ActivityOptionsFooter'
import { ActivityOptionsPage } from './activity/ActivityOptionsPage'
import { ActivityTopLists } from './activity/ActivityTopLists'
import { errMessage, formatDayTitle, formatDuration, todayKey } from './activity/format'
import { useActivityWidget } from './activity/useActivityWidget'
import { WidgetTitlebar } from './WidgetTitlebar'

export function ActivityWidget() {
  const {
    data,
    settings,
    viewDate,
    busy,
    hint,
    hintError,
    confirmClear,
    optionsOpen,
    journal,
    allowApps,
    allowDomains,
    allowProjects,
    allowUrls,
    isToday,
    activeMs,
    categoryRows,
    categoryMeta,
    categoryOptions,
    customCategories,
    qualityHint,
    session,
    afkLabel,
    setAllowApps,
    setAllowDomains,
    setAllowProjects,
    setAllowUrls,
    setOptionsOpen,
    setConfirmClear,
    setStatus,
    setCategoryMenuOpen,
    goDay,
    togglePause,
    toggleManualAfk,
    toggleStoreTitles,
    toggleParseIde,
    setIdleThreshold,
    cycleFocusDwell,
    doExport,
    cycleBrowserDetail,
    doClear,
    correct,
    reloadRules,
    addCategory,
    updateCategory,
    deleteCategory,
    focusPauseToggle,
    focusStop,
    saveAllowlist,
  } = useActivityWidget()

  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | null>(null)

  const manualAfk = settings?.manualAfk ?? data.manualAfk ?? false

  function openOptions() {
    setOptionsOpen(true)
    setConfirmClear(false)
  }

  function closeOptions() {
    setOptionsOpen(false)
    setConfirmClear(false)
  }

  function changeDay(delta: number) {
    setCategoryFilter(null)
    void goDay(delta)
  }

  const filterLabel =
    categoryFilter != null
      ? (categoryMeta.labels[categoryFilter] ?? categoryFilter)
      : null

  return (
    <div className="widget-shell activity-shell drag-region">
      <WidgetTitlebar />
      {!optionsOpen ? (
        <header className="activity-header">
          <div>
            <div className="activity-kicker">Activité</div>
            <div className="activity-title-row">
              <button
                type="button"
                className="activity-day-nav no-drag"
                disabled={busy}
                aria-label="Jour précédent"
                onClick={() => changeDay(-1)}
              >
                ‹
              </button>
              <h1 className="activity-title">{formatDayTitle(viewDate, todayKey())}</h1>
              <button
                type="button"
                className="activity-day-nav no-drag"
                disabled={busy || isToday || viewDate >= todayKey()}
                aria-label="Jour suivant"
                onClick={() => changeDay(1)}
              >
                ›
              </button>
            </div>
          </div>
          <div className="activity-header-meta no-drag">
            {manualAfk ? (
              <span
                className="activity-media-badge activity-afk-badge"
                title="AFK forcé manuellement — le suivi reprend au prochain clic AFK"
              >
                AFK manuel
              </span>
            ) : data.mediaKeepAwake ? (
              <span
                className="activity-media-badge"
                title="Lecture média signalée par l’extension — AFK auto suspendu"
              >
                Média
              </span>
            ) : null}
            <span
              className={`activity-live${data.tracking ? '' : ' is-paused'}`}
              title={data.tracking ? 'Suivi actif' : 'Suivi en pause'}
            >
              <span className="activity-live-dot" />
              {data.tracking ? 'Suivi' : 'Pause'}
            </span>
          </div>
        </header>
      ) : null}

      <div className="activity-body no-drag">
        {optionsOpen ? (
          <ActivityOptionsPage
            busy={busy}
            paused={data.paused}
            manualAfk={manualAfk}
            settings={settings}
            afkLabel={afkLabel}
            categoryOptions={categoryOptions}
            customCategories={customCategories}
            onBack={closeOptions}
            onTogglePause={() => void togglePause()}
            onToggleManualAfk={() => void toggleManualAfk()}
            onCycleBrowserDetail={() => void cycleBrowserDetail()}
            onToggleStoreTitles={() => void toggleStoreTitles()}
            onToggleParseIde={() => void toggleParseIde()}
            onSetIdleThreshold={(sec) => void setIdleThreshold(sec)}
            onCycleFocusDwell={() => void cycleFocusDwell()}
            onReloadRules={() => void reloadRules()}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
          />
        ) : (
          <>
            {!data.urlHelperAvailable && (settings?.browserDetail ?? 'domain') !== 'off' ? (
              <div className="activity-banner activity-banner-warn" role="status">
                Helper URL introuvable — domaines via titre uniquement. Rebuild :{' '}
                <code>npm run build:helpers</code>
              </div>
            ) : null}

            <section className="activity-hero activity-hero-split">
              <div className="activity-hero-copy">
                <div className="activity-hero-total">{formatDuration(activeMs)}</div>
                <div className="activity-hero-sub">
                  temps actif · {formatDuration(data.byCategory.afk ?? 0)} AFK
                </div>
                {qualityHint ? (
                  <div className="activity-quality" title="Part du temps classé « Autre »">
                    {qualityHint}
                    {(data.quality?.feedbackCountToday ?? 0) > 0
                      ? ` · ${data.quality.feedbackCountToday} correction(s)`
                      : ''}
                  </div>
                ) : null}
              </div>
              <ActivityCategoryRing
                categoryRows={categoryRows}
                activeMs={activeMs}
                categoryMeta={categoryMeta}
                selectedCategory={categoryFilter}
                onSelectCategory={(id) =>
                  setCategoryFilter(id as ActivityCategory | null)
                }
              />
            </section>

            {session ? (
              <ActivityFocusPanel
                session={session}
                busy={busy}
                allowApps={allowApps}
                allowDomains={allowDomains}
                allowProjects={allowProjects}
                allowUrls={allowUrls}
                onAllowAppsChange={setAllowApps}
                onAllowDomainsChange={setAllowDomains}
                onAllowProjectsChange={setAllowProjects}
                onAllowUrlsChange={setAllowUrls}
                onPauseToggle={() => void focusPauseToggle()}
                onStop={() => void focusStop()}
                onSaveAllowlist={() => void saveAllowlist()}
              />
            ) : null}

            {data.current && isToday ? (
              <ActivityNowCard
                current={data.current}
                busy={busy}
                categoryOptions={categoryOptions}
                onCorrect={correct}
                onMenuOpenChange={setCategoryMenuOpen}
              />
            ) : null}

            {filterLabel ? (
              <div className="activity-category-filter" role="status">
                <span>
                  Filtre : <strong>{filterLabel}</strong>
                </span>
                <button
                  type="button"
                  className="activity-category-filter-clear"
                  onClick={() => setCategoryFilter(null)}
                >
                  Tout afficher
                </button>
              </div>
            ) : null}

            <ActivityTopLists
              data={data}
              busy={busy}
              categoryMeta={categoryMeta}
              categoryOptions={categoryOptions}
              categoryFilter={categoryFilter}
              onCorrect={correct}
              onMenuOpenChange={setCategoryMenuOpen}
            />

            <ActivityFocusJournal journal={journal} />
          </>
        )}
      </div>

      <ActivityOptionsFooter
        busy={busy}
        optionsOpen={optionsOpen}
        confirmClear={confirmClear}
        hint={hint}
        hintError={hintError}
        onOpenOptions={openOptions}
        onExport={(fmt) => void doExport(fmt)}
        onOpenRules={() =>
          void window.lattice.openActivityRules().catch((err) => {
            setStatus(errMessage(err, 'Impossible d’ouvrir rules.json.'), true)
          })
        }
        onClear={() => void doClear()}
        onCancelClear={() => {
          setConfirmClear(false)
          setStatus(null)
        }}
      />
    </div>
  )
}

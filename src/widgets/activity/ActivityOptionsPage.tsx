import type { ReactNode } from 'react'
import type { ActivityCustomCategory, ActivitySettings } from '../../vite-env'
import { ActivityCategoryManager } from './ActivityCategoryManager'
import { AFK_PRESETS, type CategoryOption } from './format'

type ActivityOptionsPageProps = {
  busy: boolean
  paused: boolean
  manualAfk: boolean
  settings: ActivitySettings | null
  afkLabel: string
  categoryOptions: CategoryOption[]
  customCategories: ActivityCustomCategory[]
  onBack: () => void
  onTogglePause: () => void
  onToggleManualAfk: () => void
  onCycleBrowserDetail: () => void
  onToggleStoreTitles: () => void
  onToggleParseIde: () => void
  onSetIdleThreshold: (sec: number) => void
  onCycleFocusDwell: () => void
  onReloadRules: () => void
  onAddCategory: (label: string, color: string) => Promise<boolean>
  onUpdateCategory: (
    id: string,
    patch: { label?: string; color?: string },
  ) => Promise<boolean>
  onDeleteCategory: (id: string) => Promise<boolean>
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="activity-setting-row">
      <div className="activity-setting-copy">
        <span className="activity-setting-label">{label}</span>
        {hint ? <span className="activity-setting-hint">{hint}</span> : null}
      </div>
      <div className="activity-setting-control">{children}</div>
    </div>
  )
}

function Switch({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`activity-switch${checked ? ' is-on' : ''}`}
      disabled={disabled}
      onClick={() => void onToggle()}
    >
      <span className="activity-switch-thumb" aria-hidden />
    </button>
  )
}

export function ActivityOptionsPage({
  busy,
  paused,
  manualAfk,
  settings,
  afkLabel,
  categoryOptions,
  customCategories,
  onBack,
  onTogglePause,
  onToggleManualAfk,
  onCycleBrowserDetail,
  onToggleStoreTitles,
  onToggleParseIde,
  onSetIdleThreshold,
  onCycleFocusDwell,
  onReloadRules,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: ActivityOptionsPageProps) {
  const webLabel =
    settings?.browserDetail === 'url'
      ? 'URL'
      : settings?.browserDetail === 'off'
        ? 'Off'
        : 'Domaine'

  return (
    <div className="activity-options-page" aria-label="Options de suivi">
      <div className="activity-options-page-head">
        <button
          type="button"
          className="activity-day-nav"
          disabled={busy}
          aria-label="Retour à l’activité"
          onClick={onBack}
        >
          ‹
        </button>
        <div>
          <div className="activity-kicker">Activité</div>
          <h2 className="activity-options-page-title">Options</h2>
        </div>
      </div>

      <section className="activity-options-section activity-card" aria-label="Suivi">
        <div className="activity-section-title">Suivi rapide</div>
        <div className="activity-settings-list">
          <SettingRow label="Pause" hint="Suspend le suivi">
            <Switch
              checked={paused}
              disabled={busy}
              label="Pause"
              onToggle={onTogglePause}
            />
          </SettingRow>
          <SettingRow label="AFK" hint="Marquer comme absent">
            <Switch
              checked={manualAfk}
              disabled={busy || !settings}
              label="AFK manuel"
              onToggle={onToggleManualAfk}
            />
          </SettingRow>
        </div>
      </section>

      <section className="activity-options-section activity-card" aria-label="Réglages avancés">
        <div className="activity-section-title">Avancé</div>
        <div className="activity-settings-list">
          <SettingRow label="Détail navigateur" hint="Domaine, URL complète ou off">
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void onCycleBrowserDetail()}
            >
              {webLabel}
            </button>
          </SettingRow>
          <SettingRow label="Titres de fenêtres" hint="Sinon hash seul">
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void onToggleStoreTitles()}
            >
              {settings?.storeTitles ? 'On' : 'Off'}
            </button>
          </SettingRow>
          <SettingRow label="Parse IDE" hint="Cursor / VS Code / Slack">
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void onToggleParseIde()}
            >
              {settings?.parseIdeTitles ? 'On' : 'Off'}
            </button>
          </SettingRow>
          <SettingRow label="Seuil AFK auto">
            <select
              className="activity-select activity-select-compact"
              disabled={busy || !settings}
              value={settings?.idleThresholdSec ?? 60}
              aria-label="Seuil AFK auto"
              onChange={(e) => {
                void onSetIdleThreshold(Number(e.target.value))
              }}
            >
              {AFK_PRESETS.map((p) => (
                <option key={p.sec} value={p.sec}>
                  {p.label}
                </option>
              ))}
              {settings &&
              !AFK_PRESETS.some((p) => p.sec === settings.idleThresholdSec) ? (
                <option value={settings.idleThresholdSec}>{afkLabel}</option>
              ) : null}
            </select>
          </SettingRow>
          <SettingRow
            label="Stabilité focus"
            hint="Délai avant de valider un changement d’app (et interruption Notion hors allowlist)"
          >
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy || !settings}
              onClick={() => void onCycleFocusDwell()}
            >
              {settings?.focusOffProjectDwellSec ?? 8}s
            </button>
          </SettingRow>
          <SettingRow label="Règles" hint="Recharger rules.json">
            <button
              type="button"
              className="activity-btn activity-btn-ghost"
              disabled={busy}
              onClick={() => void onReloadRules()}
            >
              Recharger
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="activity-options-section activity-card" aria-label="Catégories">
        <ActivityCategoryManager
          options={categoryOptions}
          customCategories={customCategories}
          busy={busy}
          onAdd={onAddCategory}
          onUpdate={onUpdateCategory}
          onDelete={onDeleteCategory}
        />
      </section>
    </div>
  )
}

/**
 * Activity widget state: day summary, settings, rules (custom categories), and focus controls.
 * Subscribes to `activity-updated` / focus events from main; mutations go
 * through window.lattice (activity + focus APIs). Day navigation is local.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActivityBrowserDetail,
  ActivityCategory,
  ActivityCorrectionScope,
  ActivityCustomCategory,
  ActivityDaySummary,
  ActivityRules,
  ActivitySettings,
} from '../../vite-env'
import {
  AFK_PRESETS,
  buildCategoryMeta,
  emptySummary,
  errMessage,
  shiftDate,
  todayKey,
} from './format'
import { useFocusSessionControls } from './useFocusSessionControls'

export function useActivityWidget() {
  const [summary, setSummary] = useState<ActivityDaySummary | null>(null)
  const [settings, setSettings] = useState<ActivitySettings | null>(null)
  const [rules, setRules] = useState<ActivityRules | null>(null)
  const [viewDate, setViewDate] = useState(todayKey)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [hintError, setHintError] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const viewDateRef = useRef(viewDate)
  viewDateRef.current = viewDate
  // While a category <select> has focus (best proxy we have for "the native
  // dropdown might be open" — the DOM exposes no such signal), ignore live
  // pushes: the OS foreground briefly switches to this window, the tracker
  // classifies that as "ignored", and re-rendering would close the dropdown
  // mid-pick. See CategorySelect.onMenuOpenChange.
  const categoryMenuOpenRef = useRef(false)

  const setCategoryMenuOpen = useCallback((open: boolean) => {
    if (categoryMenuOpenRef.current === open) return
    categoryMenuOpenRef.current = open
    if (!open) {
      void window.lattice
        .getActivitySummary(viewDateRef.current)
        .then((s) => {
          // Guard against a fast reopen (new focus) racing this refetch.
          if (viewDateRef.current === todayKey() && !categoryMenuOpenRef.current) {
            setSummary(s)
          }
        })
        .catch(() => undefined)
    }
  }, [])

  function setStatus(message: string | null, isError = false) {
    setHint(message)
    setHintError(isError)
  }

  const focus = useFocusSessionControls({
    viewDate,
    viewDateRef,
    setBusy,
    setStatus,
    setSummary,
  })

  useEffect(() => {
    let alive = true
    void window.lattice
      .getActivitySummary(viewDate)
      .then((s) => {
        if (alive) setSummary(s)
      })
      .catch(() => undefined)
    void window.lattice
      .getActivitySettings()
      .then((s) => {
        if (alive) setSettings(s)
      })
      .catch(() => undefined)
    void window.lattice
      .getActivityRules()
      .then((r) => {
        if (alive) setRules(r)
      })
      .catch(() => undefined)
    const offActivity = window.lattice.onActivityUpdated((s) => {
      if (viewDateRef.current === todayKey() && !categoryMenuOpenRef.current) {
        setSummary(s)
      }
      if (s.focusSession !== undefined) {
        focus.ingestFromActivitySummary(s.focusSession)
      }
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              paused: s.paused,
              manualAfk: s.manualAfk ?? prev.manualAfk,
            }
          : {
              paused: s.paused,
              storeTitles: true,
              idleThresholdSec: 60,
              manualAfk: s.manualAfk ?? false,
              browserDetail: 'domain',
              parseIdeTitles: true,
              focusOffProjectDwellSec: 8,
            },
      )
    })
    return () => {
      alive = false
      offActivity()
    }
  }, [])

  useEffect(() => {
    let alive = true
    void window.lattice
      .getActivitySummary(viewDate)
      .then((s) => {
        if (alive) setSummary(s)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [viewDate])

  const data = summary ?? emptySummary(viewDate)
  const isToday = data.date === todayKey()
  const categoryMeta = useMemo(
    () =>
      buildCategoryMeta(rules?.customCategories, {
        overrides: rules?.categoryOverrides,
        disabled: rules?.disabledCategories,
      }),
    [rules?.customCategories, rules?.categoryOverrides, rules?.disabledCategories],
  )

  const activeMs = useMemo(() => {
    return categoryMeta.order
      .filter((c) => c !== 'afk')
      .reduce((acc, c) => acc + (data.byCategory[c] ?? 0), 0)
  }, [data, categoryMeta.order])

  const categoryRows = useMemo(() => {
    return categoryMeta.order
      .map((id) => ({
        id,
        label: categoryMeta.labels[id] ?? id,
        color: categoryMeta.colors[id] ?? '#9b7dba',
        ms: data.byCategory[id] ?? 0,
      }))
      .filter(
        (row) =>
          row.ms > 0 ||
          row.id === 'work' ||
          row.id === 'studies' ||
          row.id === 'entertainment',
      )
  }, [data, categoryMeta])

  const qualityHint = useMemo(() => {
    const pct = Math.round((data.quality?.otherShare ?? 0) * 100)
    if (pct < 8) return null
    return `${pct} % Autre — à corriger`
  }, [data.quality])

  async function goDay(delta: number) {
    const next = shiftDate(viewDate, delta)
    if (delta > 0 && viewDate >= todayKey()) return
    if (next > todayKey()) {
      setViewDate(todayKey())
      return
    }
    setViewDate(next)
    setConfirmClear(false)
  }

  async function patchSettings(patch: Partial<ActivitySettings>, okHint?: string) {
    setBusy(true)
    setStatus(null)
    try {
      const next = await window.lattice.updateActivitySettings(patch)
      setSettings(next)
      if (okHint) setStatus(okHint)
      if (isToday) {
        const s = await window.lattice.getActivitySummary(viewDate)
        setSummary(s)
      }
    } catch (err) {
      setStatus(errMessage(err, 'Impossible de mettre à jour les réglages.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function togglePause() {
    await patchSettings({ paused: !data.paused })
  }

  async function toggleManualAfk() {
    const next = !(settings?.manualAfk ?? false)
    await patchSettings(
      { manualAfk: next },
      next ? 'AFK manuel activé.' : 'AFK manuel désactivé.',
    )
  }

  async function toggleStoreTitles() {
    if (!settings) return
    await patchSettings(
      { storeTitles: !settings.storeTitles },
      !settings.storeTitles
        ? 'Titres de fenêtres enregistrés.'
        : 'Seuls les noms d’apps sont stockés (hash conservé).',
    )
  }

  async function toggleParseIde() {
    if (!settings) return
    await patchSettings(
      { parseIdeTitles: !settings.parseIdeTitles },
      !settings.parseIdeTitles
        ? 'Parse titres IDE activé.'
        : 'Parse titres IDE désactivé.',
    )
  }

  async function setIdleThreshold(sec: number) {
    await patchSettings(
      { idleThresholdSec: sec },
      `Seuil AFK : ${AFK_PRESETS.find((p) => p.sec === sec)?.label ?? `${sec}s`}.`,
    )
  }

  async function cycleFocusDwell() {
    if (!settings) return
    const presets = [3, 5, 8, 12, 20]
    const cur = settings.focusOffProjectDwellSec ?? 8
    const idx = presets.indexOf(cur)
    const next = presets[(idx + 1) % presets.length]
    await patchSettings(
      { focusOffProjectDwellSec: next },
      `Stabilité focus : ${next}s (changement d’app + interruption).`,
    )
  }

  async function doExport(format: 'csv' | 'json') {
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.exportActivity({
        format,
        from: data.date,
        to: data.date,
      })
      setStatus(
        res.ok ? `Exporté : ${res.path}` : res.message ?? 'Export annulé.',
        !res.ok && Boolean(res.message),
      )
    } catch (err) {
      setStatus(errMessage(err, 'Export impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function cycleBrowserDetail() {
    if (!settings) return
    const order: ActivityBrowserDetail[] = ['domain', 'url', 'off']
    const idx = order.indexOf(settings.browserDetail ?? 'domain')
    const nextDetail = order[(idx + 1) % order.length]
    let detailMsg = 'Navigateur : détail désactivé.'
    if (nextDetail === 'domain') detailMsg = 'Navigateur : domaine uniquement.'
    else if (nextDetail === 'url') detailMsg = 'Navigateur : URL complète.'
    await patchSettings({ browserDetail: nextDetail }, detailMsg)
  }

  async function doClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      setStatus('Confirmer : effacer tout l’historique ? (règles conservées)')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.clearActivityData()
      if (res.summary) {
        setViewDate(todayKey())
        setSummary(res.summary)
      }
      setStatus(res.message, !res.ok)
      setConfirmClear(false)
    } catch (err) {
      setStatus(errMessage(err, 'Effacement impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function correct(
    app: string,
    category: ActivityCategory,
    scope: ActivityCorrectionScope,
    titleSample?: string | null,
    domain?: string | null,
  ) {
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.correctActivityCategory({
        app,
        category,
        scope,
        titleSample,
        domain,
      })
      if (res.rules) setRules(res.rules)
      if (res.summary && isToday) setSummary(res.summary)
      else if (res.ok) {
        const s = await window.lattice.getActivitySummary(viewDate)
        setSummary(s)
      }
      setStatus(
        res.ok ? res.message ?? 'Correction enregistrée.' : res.message ?? 'Échec.',
        !res.ok,
      )
    } catch (err) {
      setStatus(errMessage(err, 'Correction impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function reloadRules() {
    setBusy(true)
    setStatus(null)
    try {
      const next = await window.lattice.reloadActivityRules()
      setRules(next)
      const s = await window.lattice.getActivitySummary(viewDate)
      setSummary(s)
      setStatus('Règles rechargées.')
      setConfirmClear(false)
    } catch (err) {
      setStatus(errMessage(err, 'Rechargement des règles impossible.'), true)
    } finally {
      setBusy(false)
    }
  }

  async function addCategory(label: string, color: string) {
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.addActivityCategory({ label, color })
      if (res.rules) setRules(res.rules)
      if (res.summary && isToday) setSummary(res.summary)
      setStatus(res.message ?? (res.ok ? 'Catégorie ajoutée.' : 'Échec.'), !res.ok)
      return res.ok
    } catch (err) {
      setStatus(errMessage(err, 'Ajout de catégorie impossible.'), true)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function updateCategory(
    id: string,
    patch: { label?: string; color?: string },
  ) {
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.updateActivityCategory({ id, ...patch })
      if (res.rules) setRules(res.rules)
      if (res.summary && isToday) setSummary(res.summary)
      setStatus(res.message ?? (res.ok ? 'Catégorie mise à jour.' : 'Échec.'), !res.ok)
      return res.ok
    } catch (err) {
      setStatus(errMessage(err, 'Mise à jour de catégorie impossible.'), true)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function deleteCategory(id: string) {
    setBusy(true)
    setStatus(null)
    try {
      const res = await window.lattice.deleteActivityCategory({ id })
      if (res.rules) setRules(res.rules)
      if (res.summary) setSummary(res.summary)
      else if (res.ok) {
        const s = await window.lattice.getActivitySummary(viewDate)
        setSummary(s)
      }
      setStatus(res.message ?? (res.ok ? 'Catégorie supprimée.' : 'Échec.'), !res.ok)
      return res.ok
    } catch (err) {
      setStatus(errMessage(err, 'Suppression de catégorie impossible.'), true)
      return false
    } finally {
      setBusy(false)
    }
  }

  const session = focus.focusSession ?? data.focusSession

  const afkLabel =
    AFK_PRESETS.find((p) => p.sec === settings?.idleThresholdSec)?.label ??
    (settings ? `${settings.idleThresholdSec}s` : '…')

  const customCategories: ActivityCustomCategory[] = categoryMeta.custom

  return {
    data,
    settings,
    rules,
    viewDate,
    busy,
    hint,
    hintError,
    confirmClear,
    optionsOpen,
    journal: focus.journal,
    allowApps: focus.allowApps,
    allowDomains: focus.allowDomains,
    allowProjects: focus.allowProjects,
    allowUrls: focus.allowUrls,
    isToday,
    activeMs,
    categoryRows,
    categoryMeta,
    categoryOptions: categoryMeta.options,
    customCategories,
    qualityHint,
    session,
    afkLabel,
    setAllowApps: focus.setAllowApps,
    setAllowDomains: focus.setAllowDomains,
    setAllowProjects: focus.setAllowProjects,
    setAllowUrls: focus.setAllowUrls,
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
    focusPauseToggle: focus.focusPauseToggle,
    focusStop: focus.focusStop,
    saveAllowlist: focus.saveAllowlist,
  }
}

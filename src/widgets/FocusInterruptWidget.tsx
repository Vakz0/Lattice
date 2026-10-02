import { useEffect, useState } from 'react'
import type { FocusInterruptAction, FocusInterruptContext } from '../vite-env'
import { extractYoutubeVideoId, youtubeTitleAllowlistKey } from '../../shared/youtubeVideo'

export function FocusInterruptWidget() {
  const [ctx, setCtx] = useState<FocusInterruptContext | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void window.lattice.getPendingFocusInterrupt().then((pending) => {
      if (alive && pending) setCtx(pending)
    }).catch(() => undefined)
    const off = window.lattice.onFocusInterrupt((next) => {
      setCtx(next)
      setNote('')
      setError(null)
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  async function resolve(action: FocusInterruptAction) {
    const trimmed = note.trim()
    if (action !== 'resume' && !trimmed) {
      setError('Indique une raison avant de continuer.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await window.lattice.resolveFocusInterrupt({
        action,
        note: trimmed,
      })
      if (!res.ok) {
        setError(res.message ?? 'Échec.')
        return
      }
      await window.lattice.hideFocusInterrupt()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec.')
    } finally {
      setBusy(false)
    }
  }

  const youtubeVideo =
    ctx != null ? extractYoutubeVideoId(ctx.domain, ctx.urlPath) : null
  const isYoutubeAllow =
    Boolean(youtubeVideo) || Boolean(ctx && youtubeTitleAllowlistKey(ctx.title))
  const hasReason = note.trim().length > 0
  const reasonTitle = hasReason ? undefined : 'Une raison est obligatoire'

  const contextBits = [
    ctx?.app,
    ctx?.domain,
    youtubeVideo ? `vidéo ${youtubeVideo}` : null,
    ctx?.projectName,
    ctx?.title,
  ].filter(Boolean)

  return (
    <div className="widget-shell focus-interrupt-shell">
      <header className="focus-interrupt-header drag-region">
        <div className="focus-interrupt-kicker">Focus</div>
        <h1 className="focus-interrupt-title">Hors projet ?</h1>
      </header>

      <div className="focus-interrupt-body no-drag">
        {ctx ? (
          <>
            <p className="focus-interrupt-task">
              Session : <strong>{ctx.notionTaskTitle}</strong>
            </p>
            <p className="focus-interrupt-context">
              Détecté : {contextBits.join(' · ') || 'activité hors allowlist'}
            </p>
          </>
        ) : (
          <p className="focus-interrupt-context">Chargement du contexte…</p>
        )}

        <label className="focus-interrupt-label" htmlFor="focus-note">
          Qu’est-ce que tu fais ? <span className="focus-interrupt-required">obligatoire sauf pour reprendre</span>
        </label>
        <textarea
          id="focus-note"
          className="focus-interrupt-note"
          rows={4}
          value={note}
          disabled={busy}
          placeholder="Justifie brièvement — requis sauf pour reprendre…"
          onChange={(e) => {
            setNote(e.target.value)
            if (error) setError(null)
          }}
        />

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="focus-interrupt-actions">
          <button
            type="button"
            className="activity-btn"
            disabled={busy}
            onClick={() => void resolve('resume')}
          >
            Reprendre le focus
          </button>
          <button
            type="button"
            className="activity-btn"
            disabled={busy || !hasReason}
            title={reasonTitle}
            onClick={() => void resolve('allow_once')}
          >
            {isYoutubeAllow ? 'Autoriser cette vidéo (session)' : 'Autoriser pour cette session'}
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-primary"
            disabled={busy || !hasReason}
            title={reasonTitle}
            onClick={() => void resolve('allow_forever')}
          >
            {isYoutubeAllow
              ? 'Toujours autoriser cette vidéo'
              : 'Toujours pour cette tâche'}
          </button>
          <button
            type="button"
            className="activity-btn"
            disabled={busy || !hasReason}
            title={reasonTitle}
            onClick={() => void resolve('pause')}
          >
            Pause session
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-danger"
            disabled={busy || !hasReason}
            title={reasonTitle}
            onClick={() => void resolve('stop')}
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  )
}

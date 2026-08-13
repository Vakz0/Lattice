import { useState } from 'react'
import type { ActivityCustomCategory } from '../../vite-env'
import {
  DEFAULT_NEW_CATEGORY_COLOR,
  type CategoryOption,
} from './format'

type ActivityCategoryManagerProps = {
  options: CategoryOption[]
  customCategories: ActivityCustomCategory[]
  busy: boolean
  onAdd: (label: string, color: string) => Promise<boolean>
  onUpdate: (
    id: string,
    patch: { label?: string; color?: string },
  ) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function ActivityCategoryManager({
  options,
  customCategories,
  busy,
  onAdd,
  onUpdate,
  onDelete,
}: ActivityCategoryManagerProps) {
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(DEFAULT_NEW_CATEGORY_COLOR)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState(DEFAULT_NEW_CATEGORY_COLOR)

  async function submitAdd() {
    const ok = await onAdd(label, color)
    if (ok) {
      setLabel('')
      setColor(DEFAULT_NEW_CATEGORY_COLOR)
      setAdding(false)
    }
  }

  async function submitEdit(id: string) {
    const ok = await onUpdate(id, { label: editLabel, color: editColor })
    if (ok) setEditingId(null)
  }

  function startEdit(opt: CategoryOption) {
    const custom = customCategories.find((c) => c.id === opt.id)
    setEditingId(opt.id)
    setEditLabel(custom?.label ?? opt.label)
    setEditColor(custom?.color ?? opt.color)
  }

  return (
    <div className="activity-cat-manager" aria-label="Catégories">
      <div className="activity-cat-manager-head">
        <span className="activity-section-title" style={{ marginBottom: 0 }}>
          Catégories
        </span>
        {!adding ? (
          <button
            type="button"
            className="activity-btn activity-btn-ghost activity-btn-tiny"
            disabled={busy}
            onClick={() => setAdding(true)}
          >
            + Nouvelle
          </button>
        ) : null}
      </div>

      <ul className="activity-cat-chip-list">
        {options.map((opt) => {
          const isEditing = editingId === opt.id
          return (
            <li key={opt.id} className="activity-cat-chip-row">
              {isEditing ? (
                <div className="activity-cat-edit-form">
                  <input
                    type="color"
                    className="activity-color-input"
                    value={editColor}
                    disabled={busy}
                    aria-label="Couleur"
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="activity-text-input"
                    value={editLabel}
                    disabled={busy}
                    maxLength={32}
                    aria-label="Nom"
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitEdit(opt.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button
                    type="button"
                    className="activity-btn activity-btn-tiny"
                    disabled={busy || !editLabel.trim()}
                    onClick={() => void submitEdit(opt.id)}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    className="activity-btn activity-btn-ghost activity-btn-tiny"
                    disabled={busy}
                    onClick={() => setEditingId(null)}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="activity-cat-dot"
                    style={{ background: opt.color }}
                    aria-hidden
                  />
                  <span className="activity-cat-chip-label">{opt.label}</span>
                  <span className="activity-cat-chip-actions">
                    <button
                      type="button"
                      className="activity-btn activity-btn-ghost activity-btn-tiny"
                      disabled={busy}
                      title="Modifier"
                      aria-label={`Modifier ${opt.label}`}
                      onClick={() => startEdit(opt)}
                    >
                      ✎
                    </button>
                    {opt.deletable ? (
                      <button
                        type="button"
                        className="activity-btn activity-btn-ghost activity-btn-tiny"
                        disabled={busy}
                        title="Supprimer (temps → Autre)"
                        aria-label={`Supprimer ${opt.label}`}
                        onClick={() => void onDelete(opt.id)}
                      >
                        ✕
                      </button>
                    ) : (
                      <span
                        className="activity-cat-chip-badge"
                        title="Catégorie de secours — non supprimable"
                      >
                        fallback
                      </span>
                    )}
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {adding ? (
        <div className="activity-cat-add-form">
          <input
            type="color"
            className="activity-color-input"
            value={color}
            disabled={busy}
            aria-label="Couleur de la catégorie"
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            type="text"
            className="activity-text-input"
            placeholder="ex. Finance"
            value={label}
            disabled={busy}
            maxLength={32}
            aria-label="Nom de la catégorie"
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitAdd()
              if (e.key === 'Escape') {
                setAdding(false)
                setLabel('')
              }
            }}
          />
          <button
            type="button"
            className="activity-btn activity-btn-tiny"
            disabled={busy || !label.trim()}
            onClick={() => void submitAdd()}
          >
            Ajouter
          </button>
          <button
            type="button"
            className="activity-btn activity-btn-ghost activity-btn-tiny"
            disabled={busy}
            onClick={() => {
              setAdding(false)
              setLabel('')
            }}
          >
            Annuler
          </button>
        </div>
      ) : null}
    </div>
  )
}

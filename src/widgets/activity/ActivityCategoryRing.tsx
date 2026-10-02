import { formatShortDuration, type CategoryMeta } from './format'

type CategoryRow = {
  id: string
  label: string
  color: string
  ms: number
}

type ActivityCategoryRingProps = {
  categoryRows: CategoryRow[]
  activeMs: number
  categoryMeta: CategoryMeta
  /** Filtre actif sur les tops (null = toutes les catégories). */
  selectedCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export function ActivityCategoryRing({
  categoryRows,
  activeMs,
  selectedCategory,
  onSelectCategory,
}: ActivityCategoryRingProps) {
  const slices = categoryRows.filter((r) => r.id !== 'afk' && r.ms > 0)
  const size = 132
  const cx = size / 2
  const cy = size / 2
  const radius = 48
  const stroke = 14

  let angle = 0
  const arcs =
    activeMs > 0 && slices.length > 0
      ? slices.map((row) => {
          const sweep = Math.max(2, (row.ms / activeMs) * 360)
          const start = angle
          const end = Math.min(360, angle + sweep)
          angle = end
          return {
            ...row,
            d: describeArc(cx, cy, radius, start, end === 360 && start === 0 ? 359.9 : end),
            pct: Math.round((row.ms / activeMs) * 100),
          }
        })
      : []

  const afkRow = categoryRows.find((r) => r.id === 'afk')
  const legendRows = categoryRows.filter(
    (r) =>
      r.id !== 'afk' &&
      (r.ms > 0 ||
        ['work', 'studies', 'entertainment', 'other', 'communication'].includes(r.id)),
  )

  function toggleCategory(id: string) {
    onSelectCategory(selectedCategory === id ? null : id)
  }

  return (
    <section className="activity-ring-section" aria-label="Par catégorie">
      <div className="activity-ring-layout">
        <div className="activity-ring-chart" aria-hidden={arcs.length === 0}>
          <svg viewBox={`0 0 ${size} ${size}`} className="activity-ring-svg">
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--track)"
              strokeWidth={stroke}
            />
            {arcs.map((arc) => (
              <path
                key={arc.id}
                d={arc.d}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeLinecap="butt"
                opacity={
                  selectedCategory && selectedCategory !== arc.id ? 0.28 : 1
                }
              />
            ))}
          </svg>
          {arcs.length === 0 ? (
            <div className="activity-ring-empty">—</div>
          ) : null}
        </div>
        <ul className="activity-ring-legend" role="listbox" aria-label="Filtrer par catégorie">
          {legendRows.map((row) => {
            const pct = activeMs > 0 ? Math.round((row.ms / activeMs) * 100) : 0
            const selected = selectedCategory === row.id
            const dimmed = Boolean(selectedCategory && !selected)
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`activity-ring-legend-row${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}`}
                  aria-pressed={selected}
                  title={
                    selected
                      ? 'Afficher toutes les catégories'
                      : `Filtrer : ${row.label}`
                  }
                  onClick={() => toggleCategory(row.id)}
                >
                  <span
                    className="activity-cat-dot"
                    style={{ background: row.color }}
                    aria-hidden
                  />
                  <span className="activity-ring-legend-label">{row.label}</span>
                  <span className="activity-ring-legend-meta">
                    {formatShortDuration(row.ms)}
                    {row.ms > 0 ? ` · ${pct}%` : ''}
                  </span>
                </button>
              </li>
            )
          })}
          {afkRow && afkRow.ms > 0 ? (
            <li className="activity-ring-legend-row is-afk">
              <span
                className="activity-cat-dot"
                style={{ background: afkRow.color }}
                aria-hidden
              />
              <span className="activity-ring-legend-label">{afkRow.label}</span>
              <span className="activity-ring-legend-meta">
                {formatShortDuration(afkRow.ms)}
              </span>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  )
}

import { screen, type Rectangle } from 'electron'

function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * Si les bounds n’intersectent aucun workArea visible, ramène la fenêtre
 * sur l’écran primaire (marge 40 px). Sinon laisse inchangé.
 */
export function ensureVisibleBounds(bounds: Rectangle): Rectangle {
  const displays = screen.getAllDisplays()
  if (!displays.length) return bounds

  const visible = displays.some((d) => intersects(bounds, d.workArea))
  if (visible) return bounds

  const area = screen.getPrimaryDisplay().workArea
  const width = Math.min(bounds.width, Math.max(120, area.width - 80))
  const height = Math.min(bounds.height, Math.max(80, area.height - 80))
  return {
    x: area.x + 40,
    y: area.y + 40,
    width,
    height,
  }
}

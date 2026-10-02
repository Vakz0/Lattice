export function formatHours(h: number): string {
  const rounded = Math.round(h * 100) / 100
  return `${rounded} h`
}

import { useEffect } from 'react'
import type { ActivityCategory } from '../../vite-env'
import { categoryPillStyle, resolveCategoryOption, type CategoryOption } from './format'

type CategorySelectProps = {
  className: string
  value: ActivityCategory
  options: CategoryOption[]
  disabled: boolean
  ariaLabel?: string
  /**
   * Fires on native focus/blur, not strictly "dropdown open" (the DOM has no
   * such signal for `<select>`) — used to freeze live pushes so the OS
   * foreground shift while picking doesn't yank this element out from under
   * the user. See `useActivityWidget.setCategoryMenuOpen`.
   */
  onMenuOpenChange: (open: boolean) => void
  onChange: (next: ActivityCategory) => void
}

/** Tinted category `<select>` shared by the Now card and Top apps/sites rows. */
export function CategorySelect({
  className,
  value,
  options,
  disabled,
  ariaLabel,
  onMenuOpenChange,
  onChange,
}: CategorySelectProps) {
  const { selectValue, selected } = resolveCategoryOption(options, value)

  // Chromium often skips `blur` when a focused <select> becomes disabled
  // (`busy` after a correction) — without this the freeze would stick forever.
  useEffect(() => {
    if (disabled) onMenuOpenChange(false)
  }, [disabled, onMenuOpenChange])

  return (
    <select
      className={className}
      disabled={disabled}
      value={selectValue}
      style={selected ? categoryPillStyle(selected.color) : undefined}
      aria-label={ariaLabel}
      onFocus={() => onMenuOpenChange(true)}
      onMouseDown={() => onMenuOpenChange(true)}
      onBlur={() => onMenuOpenChange(false)}
      onChange={(e) => {
        const next = e.target.value as ActivityCategory
        onMenuOpenChange(false)
        onChange(next)
      }}
    >
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  )
}

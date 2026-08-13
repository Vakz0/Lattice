import { describe, expect, it } from 'vitest'
import { BUILTIN_CATEGORIES } from '../../shared/types'
import {
  isEditableCategory,
  isKnownCategory,
  resolveCategory,
  slugifyCategoryId,
} from './categories'
import { emptyByCategory } from './segmentUtils'
import { DEFAULT_RULES } from './defaults'

describe('slugifyCategoryId', () => {
  it('slugifies labels with accents and spaces', () => {
    expect(slugifyCategoryId('Finance')).toBe('finance')
    expect(slugifyCategoryId(' Vie perso ')).toBe('vie-perso')
    expect(slugifyCategoryId('Études avancées')).toBe('etudes-avancees')
  })

  it('falls back when empty', () => {
    expect(slugifyCategoryId('@@@')).toBe('category')
  })
})

describe('isKnownCategory / isEditableCategory', () => {
  const rules = {
    ...DEFAULT_RULES,
    customCategories: [{ id: 'finance', label: 'Finance', color: '#4f8f6a' }],
    disabledCategories: ['entertainment'],
  }

  it('accepts builtins and customs', () => {
    expect(isKnownCategory('work', rules)).toBe(true)
    expect(isKnownCategory('finance', rules)).toBe(true)
    expect(isKnownCategory('unknown-cat', rules)).toBe(false)
    expect(isKnownCategory('afk', rules)).toBe(true)
  })

  it('rejects disabled builtins', () => {
    expect(isKnownCategory('entertainment', rules)).toBe(false)
    expect(isEditableCategory('entertainment', rules)).toBe(false)
  })

  it('editable excludes afk', () => {
    expect(isEditableCategory('finance', rules)).toBe(true)
    expect(isEditableCategory('afk', rules)).toBe(false)
  })
})

describe('resolveCategory', () => {
  it('maps disabled to other', () => {
    const rules = {
      ...DEFAULT_RULES,
      disabledCategories: ['work'],
    }
    expect(resolveCategory('work', rules)).toBe('other')
    expect(resolveCategory('afk', rules)).toBe('afk')
    expect(resolveCategory('studies', rules)).toBe('studies')
  })
})

describe('emptyByCategory', () => {
  it('includes custom keys', () => {
    const map = emptyByCategory([{ id: 'finance', label: 'Finance', color: '#4f8f6a' }])
    for (const id of BUILTIN_CATEGORIES) {
      expect(map[id]).toBe(0)
    }
    expect(map.finance).toBe(0)
  })
})

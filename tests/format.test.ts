import { describe, expect, it } from 'vitest'
import { MINUS, exactRepr, formatKey } from '../src/format/numbers'
import { ETALON_SAMPLE_1 } from './tensor/etalon-constants'

/** Все числовые листья контрольных констант walkthrough (NFR-02). */
function numbersOf(value: unknown): number[] {
  if (typeof value === 'number') return [value]
  if (Array.isArray(value)) return value.flatMap(numbersOf)
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(numbersOf)
  return []
}

describe('formatKey — ключевое число (.4g, ≤9 символов)', () => {
  it('0.63842… → «0.6384»', () => {
    expect(formatKey(0.63842)).toBe('0.6384')
  })

  it('|x| < 1e-3 → экспоненциальная форма .3e', () => {
    expect(formatKey(-0.0000245134)).toBe(`${MINUS}2.451e-5`)
    expect(formatKey(0.00045)).toBe('4.500e-4')
  })

  it('display-минус — типографский U+2212, не ASCII', () => {
    const out = formatKey(-0.4231)
    expect(out).toBe(`${MINUS}0.4231`)
    expect(out).not.toContain('-')
    expect(out.codePointAt(0)).toBe(0x2212)
  })

  it('ноль → «0»', () => {
    expect(formatKey(0)).toBe('0')
  })

  it('все числа эталон-констант форматируются в ≤9 символов', () => {
    for (const x of numbersOf(ETALON_SAMPLE_1)) {
      expect(formatKey(x).length).toBeLessThanOrEqual(9)
    }
  })
})

describe('exactRepr — полный repr без округления', () => {
  // repr-строки контрольных значений (shortest round-trip) — без литералов-потерь
  const repr1 = '0.028141387967825185'
  const repr2 = '-0.03287702859630931'

  it('восстанавливает double без потерь (round-trip)', () => {
    expect(exactRepr(JSON.parse(repr1))).toBe(repr1)
    expect(JSON.parse(exactRepr(JSON.parse(repr2)).replaceAll(MINUS, '-'))).toBe(JSON.parse(repr2))
  })

  it('display-минус U+2212, ASCII-минус не остаётся', () => {
    expect(exactRepr(-1.5)).toBe(`${MINUS}1.5`)
    expect(exactRepr(-1.5)).not.toContain('-')
  })
})

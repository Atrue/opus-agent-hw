import { describe, expect, it } from 'vitest'
import { formatKey } from '../../format'
import { CAPACITY_CHARS, fitsValue } from './capacity'

/**
 * Гейт детерминизма правила влезания (2.1-02, фикс 5): fitsValue — чистая
 * функция длины строки; таблица — реальные formatKey-выходы значений
 * сценариев (4 значащие цифры, display-минус, экспонента для |x| < 1e-3).
 */
describe('capacity: правило влезания значения в квадратный блок', () => {
  it('CAPACITY_CHARS = 8 (контракт UI-SPEC 2.1)', () => {
    expect(CAPACITY_CHARS).toBe(8)
  })

  it('таблица истинности на реальных formatKey-строках', () => {
    expect(fitsValue('н/д')).toBe(true)
    expect(fitsValue('0')).toBe(true)
    expect(fitsValue('1.6')).toBe(true)
    expect(fitsValue('−0.8')).toBe(true)
    expect(fitsValue('0.69')).toBe(true)
    expect(fitsValue('−1.234')).toBe(true)
    expect(fitsValue('1234')).toBe(true)
    expect(fitsValue('1.200e-3')).toBe(true) // ровно 8 — внутри
    expect(fitsValue('−1.200e-3')).toBe(false) // 9 — над блоком
    expect(fitsValue('−1.234e-5')).toBe(false)
    expect(fitsValue('123456789')).toBe(false)
  })

  it('согласован с formatKey: выходы сценариев классифицируются без исключений', () => {
    for (const x of [0, 1.6, -0.8, 0.69, 0.5, 0.31, -1.2345678, 0.0012, -0.0000123, 123.4567, -1234.5]) {
      const s = formatKey(x)
      expect(fitsValue(s), `fitsValue(${s}) без исключений`).toBe(s.length <= CAPACITY_CHARS)
    }
  })
})

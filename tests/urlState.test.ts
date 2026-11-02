import { describe, expect, it } from 'vitest'
import { parseHash, toHash } from '../src/player/urlState'

/** URL-state (микропроверка DOCS-05): hash #step=N&mode=lecture — единственный
 *  внешний «ввод» приложения; невалидное клампится к дефолту (threat T-1-04). */

describe('round-trip state ↔ hash', () => {
  it('toHash(3, true) → #step=3&mode=lecture и обратно', () => {
    expect(toHash(3, true)).toBe('#step=3&mode=lecture')
    expect(parseHash('#step=3&mode=lecture')).toEqual({ step: 3, lecture: true })
  })

  it('toHash(0, false) → #step=0 (без mode)', () => {
    expect(toHash(0, false)).toBe('#step=0')
    expect(parseHash('#step=0')).toEqual({ step: 0, lecture: false })
  })

  it('round-trip для всех 14 шагов и обоих режимов', () => {
    for (let step = 0; step <= 13; step++) {
      for (const lecture of [false, true]) {
        expect(parseHash(toHash(step, lecture))).toEqual({ step, lecture })
      }
    }
  })
})

describe('кламп невалидных значений к дефолту (T-1-04)', () => {
  it('#step=-1 → 0', () => {
    expect(parseHash('#step=-1').step).toBe(0)
  })

  it('#step=99 → 13 (кламп к последнему шагу)', () => {
    expect(parseHash('#step=99').step).toBe(13)
  })

  it('мусорные ключи игнорируются', () => {
    expect(parseHash('#foo=bar&step=2&baz=quiz')).toEqual({ step: 2, lecture: false })
  })

  it('#step=abc (NaN) → 0', () => {
    expect(parseHash('#step=abc').step).toBe(0)
  })

  it('пустой hash → дефолт {step:0, lecture:false}', () => {
    expect(parseHash('')).toEqual({ step: 0, lecture: false })
    expect(parseHash('#')).toEqual({ step: 0, lecture: false })
  })

  it('mode=abc → default-режим (lecture:false)', () => {
    expect(parseHash('#step=4&mode=abc').lecture).toBe(false)
  })

  it('mode принимает только значение lecture', () => {
    expect(parseHash('#step=4&mode=lecture').lecture).toBe(true)
    expect(parseHash('#step=4&mode=LECTURE').lecture).toBe(false)
  })
})

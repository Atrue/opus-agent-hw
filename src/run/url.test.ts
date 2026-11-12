import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENARIO, parseHash, toHash } from './url'

/**
 * URL-state (R3, D-31): hash несёт ТОЛЬКО сценарий; дефолт — первый урок
 * «один нейрон» (#scenario=neuron — входная дверь MVP R1), xor остаётся
 * выбираемым до фазы 3. Невалидное/чужое значение клампится к дефолту
 * (threat T-01.1-01); parseHash никогда не бросает.
 */

describe('url: белый список сценариев и клампинг', () => {
  it('#scenario=neuron → neuron (дефолтный первый урок)', () => {
    expect(parseHash('#scenario=neuron')).toEqual({ scenario: 'neuron' })
  })

  it('#scenario=xor → xor (прототип остаётся выбираемым)', () => {
    expect(parseHash('#scenario=xor')).toEqual({ scenario: 'xor' })
  })

  it('пустой hash → дефолт neuron', () => {
    expect(parseHash('#')).toEqual({ scenario: DEFAULT_SCENARIO })
    expect(DEFAULT_SCENARIO).toBe('neuron')
  })

  it('невалидный сценарий клампится к дефолту (T-01.1-01)', () => {
    expect(parseHash('#scenario=bogus').scenario).toBe('neuron')
    expect(parseHash('#scenario=neuron;drop').scenario).toBe('neuron')
  })

  it('toHash — каноническая сериализация', () => {
    expect(toHash('neuron')).toBe('#scenario=neuron')
    expect(toHash('xor')).toBe('#scenario=xor')
  })
})

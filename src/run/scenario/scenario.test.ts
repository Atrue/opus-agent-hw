import { describe, expect, it } from 'vitest'
import { buildModel, SampleCursor } from '../../tensor'
import { NEURON_SCENARIO } from './index'

/**
 * Правило первого шага (Pitfall 6, D-31): стартовые константы нейрон-сценария
 * проверяются на ЖИВОМ движке ДО съёма эталон-констант (съём — план 02-09;
 * смена весов после фиксации = пересъём). Гейты: ŷ₀ ∈ [0.3, 0.7] на всех
 * примерах AND (лёгкая «неуверенность» сети), |∂L/∂ŷ| первого шага < 5
 * (полюса BCE не пугают студента), сходимость видна к 3-5 эпохе, точность
 * AND → 100% за разумное число эпох (один нейрон честно решает AND).
 */

const model = buildModel(NEURON_SCENARIO)

/** Полная эпоха на живом движке (per-sample SGD, порядок = движок). */
function runEpoch(): { losses: number[]; correct: boolean[] } {
  const losses: number[] = []
  const correct: boolean[] = []
  for (const s of NEURON_SCENARIO.samples) {
    const c = new SampleCursor(model, s.x, s.y, NEURON_SCENARIO.lr)
    while (!c.done) c.advance()
    const yhat = c.tensors.h[0]!.data[0]!
    losses.push(c.tensors.L!.data[0]!)
    correct.push((yhat >= 0.5) === (s.y >= 0.5))
  }
  return { losses, correct }
}

describe('NEURON_SCENARIO: состав (D-31/A4)', () => {
  it('id neuron; 2 входа → 1 нейрон σ; BCE; lr = 0.5', () => {
    expect(NEURON_SCENARIO.id).toBe('neuron')
    expect(NEURON_SCENARIO.net).toEqual([{ inputs: 2, units: 1, activation: 'sigmoid' }])
    expect(NEURON_SCENARIO.loss).toEqual({ kind: 'bce' })
    expect(NEURON_SCENARIO.lr).toBe(0.5)
  })

  it('датасет AND: 4 примера, первый [1,1]→1 (эталонный сэмпл)', () => {
    expect(NEURON_SCENARIO.samples).toEqual([
      { x: [1, 1], y: 1 },
      { x: [0, 1], y: 0 },
      { x: [1, 0], y: 0 },
      { x: [0, 0], y: 0 },
    ])
  })

  it('8 операций walkthrough: 3 forward + bce + 3 backward-группы + sgd; формулы/нарративы RU непустые', () => {
    expect(NEURON_SCENARIO.ops).toHaveLength(8)
    expect(NEURON_SCENARIO.ops.map((o) => o.op)).toEqual(['matvec', 'add', 'sigmoid', 'bce', 'bce-grad', 'sigmoid-grad', 'matvec-grad', 'sgd'])
    for (const o of NEURON_SCENARIO.ops) {
      expect(o.formula.trim().length, `формула ${o.op}`).toBeGreaterThan(0)
      expect(o.narrative.trim().length, `нарратив ${o.op}`).toBeGreaterThan(0)
    }
  })

  it('рамка-нейрон одна — «Нейрон 1», выход — ŷ, drill жив (2.1-03)', () => {
    expect(NEURON_SCENARIO.render.frames).toHaveLength(1)
    expect(NEURON_SCENARIO.render.frames[0]!.title).toBe('Нейрон 1')
    expect(NEURON_SCENARIO.render.frames[0]!.drill).toBe('ŷ')
  })
})

describe('NEURON_SCENARIO: правило стартовых весов первого шага (Pitfall 6)', () => {
  it('стартовое ŷ = σ(W·x + b) ∈ [0.3, 0.7] на всех примерах AND', () => {
    for (const s of NEURON_SCENARIO.samples) {
      const c = new SampleCursor(buildModel(NEURON_SCENARIO), s.x, s.y, NEURON_SCENARIO.lr)
      c.advance() // matvec
      c.advance() // add
      c.advance() // sigmoid
      const yhat = c.tensors.h[0]!.data[0]!
      expect(yhat, `ŷ₀(${s.x.join(',')}) = ${String(yhat)}`).toBeGreaterThanOrEqual(0.3)
      expect(yhat, `ŷ₀(${s.x.join(',')}) = ${String(yhat)}`).toBeLessThanOrEqual(0.7)
    }
  })

  it('|∂L/∂ŷ| первого шага < 5 на всех примерах (полюса BCE далеко)', () => {
    for (const s of NEURON_SCENARIO.samples) {
      const c = new SampleCursor(buildModel(NEURON_SCENARIO), s.x, s.y, NEURON_SCENARIO.lr)
      for (let k = 0; k < 5; k++) c.advance() // … bce-grad (4-я оп = bce, 5-я = bce-grad)
      const d = c.tensors.h[0]!.grad![0]!
      expect(Math.abs(d), `|∂L/∂ŷ|(${s.x.join(',')}) = ${String(d)}`).toBeLessThan(5)
    }
  })

  it('сходимость: средний лосс 4-й эпохи ниже 1-й; точность AND → 100% за ≤10 эпох', () => {
    const first = runEpoch()
    for (let e = 2; e <= 10; e++) {
      const r = runEpoch()
      if (e === 4) {
        const avg1 = first.losses.reduce((a, b) => a + b, 0) / first.losses.length
        const avg4 = r.losses.reduce((a, b) => a + b, 0) / r.losses.length
        expect(avg4, 'лосс 4-й эпохи ниже 1-й').toBeLessThan(avg1)
      }
      if (r.correct.every(Boolean)) return
    }
    throw new Error('точность AND не достигла 100% за 10 эпох')
  })
})

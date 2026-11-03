import { describe, expect, it } from 'vitest'
import { buildStepRecord } from '../../src/run/runState'
import { XOR_SCENARIO } from '../../src/run/scenario'
import { MLP, SampleCursor, type StepRecord, type TensorValues } from '../../src/tensor'
import { ETALON_SAMPLE_1 } from './etalon-constants'

/**
 * Эталон-мостик (NFR-02): живой тензорный движок воспроизводит контрольные
 * константы эталонного сэмпла 1 по ВСЕМ 13 операциям (forward + градиенты),
 * rel ≤ 1e-6 (abs-пол 1e-12); формулы и нарративы совпадают строкой.
 * Запись шагов идёт тем же buildStepRecord, что рендерит UI.
 */

const REL_TOL = 1e-6
const ABS_FLOOR = 1e-12

function flatten(values: TensorValues): number[] {
  const first = values[0]
  if (Array.isArray(first)) return (values as number[][]).flat()
  return [...(values as number[])]
}

function expectValuesClose(actual: TensorValues, expected: TensorValues, ctx: string): void {
  const a = flatten(actual)
  const e = flatten(expected)
  expect(a.length, `${ctx}: длина`).toBe(e.length)
  for (let i = 0; i < e.length; i++) {
    const tol = Math.max(REL_TOL * Math.abs(e[i]!), ABS_FLOOR)
    expect(Math.abs(a[i]! - e[i]!), `${ctx}[${String(i)}]: |${String(a[i])} − ${String(e[i])}| ≤ ${String(tol)}`).toBeLessThanOrEqual(tol)
  }
}

/** Прогон сэмпла 1 пошагово на живом движке (с записью, как в UI). */
function runEtalonSample(): StepRecord[] {
  const model = new MLP(XOR_SCENARIO.startWeights)
  const sample = XOR_SCENARIO.samples[0]!
  const cursor = new SampleCursor(model, sample.x, sample.y, XOR_SCENARIO.lr)
  const records: StepRecord[] = []
  while (!cursor.done) {
    const op = cursor.opIndex
    cursor.advance()
    records.push(buildStepRecord(cursor, op))
  }
  return records
}

describe('эталон-мостик: движок ↔ контрольные константы (сэмпл 1, стартовые веса)', () => {
  it('13 операций; формулы и нарративы совпадают строкой', () => {
    const records = runEtalonSample()
    expect(records).toHaveLength(ETALON_SAMPLE_1.length)
    for (let k = 0; k < ETALON_SAMPLE_1.length; k++) {
      const rec = records[k]!
      const etalon = ETALON_SAMPLE_1[k]!
      expect(rec.formula, `оп ${String(k)}: формула`).toBe(etalon.formula)
      expect(rec.narrative.ru, `оп ${String(k)}: нарратив`).toBe(etalon.narrative)
    }
  })

  it('outputs каждой операции совпадают с константами (rel ≤ 1e-6)', () => {
    const records = runEtalonSample()
    for (let k = 0; k < ETALON_SAMPLE_1.length; k++) {
      const rec = records[k]!
      const etalon = ETALON_SAMPLE_1[k]!
      expectValuesClose(rec.outputs.values, etalon.outputs, `оп ${String(k)} (${etalon.op}): outputs`)
    }
  })

  it('grads каждой операции совпадают с константами (rel ≤ 1e-6)', () => {
    const records = runEtalonSample()
    for (let k = 0; k < ETALON_SAMPLE_1.length; k++) {
      const rec = records[k]!
      const etalon = ETALON_SAMPLE_1[k]!
      expect(rec.grads === null, `оп ${String(k)}: наличие grads`).toBe(etalon.grads === null)
      if (etalon.grads === null || rec.grads === null) continue
      expect(Object.keys(rec.grads).sort(), `оп ${String(k)}: ключи grads`).toEqual(Object.keys(etalon.grads).sort())
      for (const [sym, values] of Object.entries(etalon.grads)) {
        expectValuesClose(rec.grads[sym]!, values, `оп ${String(k)}: grads[${sym}]`)
      }
    }
  })
})

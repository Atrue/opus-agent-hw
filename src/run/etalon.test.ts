import { describe, expect, it } from 'vitest'
import { buildStepRecord } from './stepRecords'
import { NEURON_SCENARIO, XOR_SCENARIO, type ScenarioModel } from './scenario'
import { buildModel, SampleCursor, type StepRecord, type TensorValues } from '../tensor'
import { ETALON_NEURON_SAMPLE_1, ETALON_SAMPLE_1, type EtalonStep } from './etalon-constants'

/**
 * Эталон-мостик (NFR-02): живой тензорный движок воспроизводит контрольные
 * константы эталонного сэмпла 1 по ВСЕМ операциям (forward + градиенты),
 * rel ≤ 1e-6 (abs-пол 1e-12); формулы и нарративы совпадают строкой.
 * Запись шагов идёт тем же buildStepRecord, что рендерит UI. XOR —
 * регрессия движка (константы фазы 01.1); neuron — константы 02-09,
 * перекрёстно проверенные gradcheck ДО фиксации.
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
function runEtalonSample(spec: ScenarioModel = XOR_SCENARIO): StepRecord[] {
  const model = buildModel(spec)
  const sample = spec.samples[0]!
  const cursor = new SampleCursor(model, sample.x, sample.y, spec.lr)
  const records: StepRecord[] = []
  while (!cursor.done) {
    const op = cursor.opIndex
    cursor.advance()
    records.push(buildStepRecord(cursor, op, spec))
  }
  return records
}

/** Сверка прогона сэмпла 1 против эталон-констант (общая для сценариев). */
function expectEtalonMatch(spec: ScenarioModel, etalon: readonly EtalonStep[], label: string): void {
  const records = runEtalonSample(spec)
  expect(records).toHaveLength(etalon.length)
  for (let k = 0; k < etalon.length; k++) {
    const rec = records[k]!
    const step = etalon[k]!
    expect(rec.formula, `${label} оп ${String(k)}: формула`).toBe(step.formula)
    expect(rec.narrative.ru, `${label} оп ${String(k)}: нарратив`).toBe(step.narrative)
    expectValuesClose(rec.outputs.values, step.outputs, `${label} оп ${String(k)} (${step.op}): outputs`)
    expect(rec.grads === null, `${label} оп ${String(k)}: наличие grads`).toBe(step.grads === null)
    if (step.grads === null || rec.grads === null) continue
    expect(Object.keys(rec.grads).sort(), `${label} оп ${String(k)}: ключи grads`).toEqual(Object.keys(step.grads).sort())
    for (const [sym, values] of Object.entries(step.grads)) {
      expectValuesClose(rec.grads[sym]!, values, `${label} оп ${String(k)}: grads[${sym}]`)
    }
  }
}

describe('эталон-мостик: движок ↔ контрольные константы (сэмпл 1, стартовые веса)', () => {
  it('XOR (регрессия): 13 операций; формулы/нарративы строкой, outputs/grads rel ≤ 1e-6', () => {
    expectEtalonMatch(XOR_SCENARIO, ETALON_SAMPLE_1, 'XOR')
  })

  it('neuron: 8 операций; формулы/нарративы строкой, outputs/grads rel ≤ 1e-6', () => {
    expectEtalonMatch(NEURON_SCENARIO, ETALON_NEURON_SAMPLE_1, 'neuron')
  })
})

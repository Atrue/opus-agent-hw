import { describe, expect, it } from 'vitest'
import { buildStepRecord } from '../../src/run/runState'
import { XOR_SCENARIO } from '../../src/run/scenario'
import { MLP, SampleCursor, type StepRecord, type TensorValues } from '../../src/tensor'
import { ETALON_SAMPLE_1 } from './etalon-constants'

/**
 * Инварианты движка в CI (R1 §6 вариант D, R3): (а) «пошагово = fast-forward»
 * — прогон эпохи с записью и без записи даёт идентичные веса и лосс-точки
 * (код исполнения один); (б) детерминизм — два независимых прогона от
 * стартовых констант идентичны; (в) per-op сверка типов операций с
 * контрольными константами (математика, а не обещание).
 */

const REL_TOL = 1e-6
const ABS_FLOOR = 1e-12

function flatten(values: TensorValues): number[] {
  const first = values[0]
  if (Array.isArray(first)) return (values as number[][]).flat()
  return [...(values as number[])]
}

function expectClose(actual: number, expected: number, ctx: string): void {
  const tol = Math.max(REL_TOL * Math.abs(expected), ABS_FLOOR)
  expect(Math.abs(actual - expected), ctx).toBeLessThanOrEqual(tol)
}

interface EpochResult {
  weights: Float64Array[]
  losses: number[]
  records: StepRecord[]
}

/** Прогон одной эпохи (4 сэмпла × 13 операций) на свежей модели.
 *  record:true — пошаговый режим UI (рекордер пишет StepRecord после каждой оп);
 *  record:false — пакетный fast-forward без записи. */
function runEpoch(record: boolean): EpochResult {
  const model = new MLP(XOR_SCENARIO.startWeights)
  const losses: number[] = []
  const records: StepRecord[] = []
  for (const sample of XOR_SCENARIO.samples) {
    const recorder = record
      ? (cursor: SampleCursor, op: number) => {
          records.push(buildStepRecord(cursor, op))
          if (op === 6) losses.push(cursor.tensors.L!.data[0]!)
        }
      : undefined
    const cursor = new SampleCursor(model, sample.x, sample.y, XOR_SCENARIO.lr, recorder)
    while (!cursor.done) {
      const op = cursor.opIndex
      cursor.advance()
      if (!record && op === 6) losses.push(cursor.tensors.L!.data[0]!)
    }
  }
  return { weights: model.params().map((p) => Float64Array.from(p.data)), losses, records }
}

describe('инвариант «пошагово = fast-forward» (R1/R3)', () => {
  it('эпоха с record:true и с record:false даёт идентичные веса и лосс-точки', () => {
    const stepwise = runEpoch(true)
    const batch = runEpoch(false)
    expect(stepwise.weights).toHaveLength(batch.weights.length)
    for (let p = 0; p < batch.weights.length; p++) {
      expect(stepwise.weights[p]!, `параметр #${String(p)} идентичен бит-в-бит`).toEqual(batch.weights[p])
    }
    expect(stepwise.losses).toEqual(batch.losses)
    // лосс-точки: 4 сэмпла × 1 bce на сэмпл
    expect(stepwise.losses).toHaveLength(XOR_SCENARIO.samples.length)
  })

  it('запись шагов не возмущает числа: 52 StepRecord за эпоху', () => {
    const stepwise = runEpoch(true)
    expect(stepwise.records).toHaveLength(XOR_SCENARIO.samples.length * 13)
  })
})

describe('детерминизм прогона (R3)', () => {
  it('два независимых прогона от стартовых констант дают идентичный результат', () => {
    const first = runEpoch(false)
    const second = runEpoch(false)
    for (let p = 0; p < first.weights.length; p++) {
      expect(first.weights[p]!, `прогон 1 vs 2, параметр #${String(p)}`).toEqual(second.weights[p])
    }
    expect(first.losses).toEqual(second.losses)
  })
})

describe('per-op сверка с контрольными константами (пакетный путь, без записи)', () => {
  it('forward-опы 0..6: промежуточные тензоры совпадают (rel ≤ 1e-6)', () => {
    const model = new MLP(XOR_SCENARIO.startWeights)
    const sample = XOR_SCENARIO.samples[0]!
    const cursor = new SampleCursor(model, sample.x, sample.y, XOR_SCENARIO.lr)
    const t = cursor.tensors
    const forwardChecks: (() => void)[] = [
      () => flatten(ETALON_SAMPLE_1[0]!.outputs as number[]).forEach((e, i) => expectClose(t.z1p!.data[i]!, e, `оп 0 z1[${String(i)}]`)),
      () => flatten(ETALON_SAMPLE_1[1]!.outputs as number[]).forEach((e, i) => expectClose(t.z1!.data[i]!, e, `оп 1 z1[${String(i)}]`)),
      () => flatten(ETALON_SAMPLE_1[2]!.outputs as number[]).forEach((e, i) => expectClose(t.a1!.data[i]!, e, `оп 2 a1[${String(i)}]`)),
      () => expectClose(t.z2p!.data[0]!, (ETALON_SAMPLE_1[3]!.outputs as number[])[0]!, 'оп 3 z2'),
      () => expectClose(t.z2!.data[0]!, (ETALON_SAMPLE_1[4]!.outputs as number[])[0]!, 'оп 4 z2'),
      () => expectClose(t.yhat!.data[0]!, (ETALON_SAMPLE_1[5]!.outputs as number[])[0]!, 'оп 5 yhat'),
      () => expectClose(t.L!.data[0]!, (ETALON_SAMPLE_1[6]!.outputs as number[])[0]!, 'оп 6 L'),
    ]
    for (const check of forwardChecks) {
      cursor.advance()
      check()
    }
  })

  it('backward-опы 7..11: градиенты живых тензоров совпадают (rel ≤ 1e-6)', () => {
    const model = new MLP(XOR_SCENARIO.startWeights)
    const sample = XOR_SCENARIO.samples[0]!
    const cursor = new SampleCursor(model, sample.x, sample.y, XOR_SCENARIO.lr)
    for (let op = 0; op <= 6; op++) cursor.advance()
    const t = cursor.tensors
    cursor.advance() // 7: bce-grad
    flatten(ETALON_SAMPLE_1[7]!.outputs as number[]).forEach((e, i) => expectClose(t.yhat!.grad![i]!, e, 'оп 7 dyhat'))
    cursor.advance() // 8: sigmoid-grad
    flatten(ETALON_SAMPLE_1[8]!.outputs as number[]).forEach((e, i) => expectClose(t.z2!.grad![i]!, e, 'оп 8 dz2'))
    cursor.advance() // 9: matvec-grad L2
    const g9 = ETALON_SAMPLE_1[9]!.grads!
    flatten(g9['∂L/∂W2']!).forEach((e, i) => expectClose(model.W2.grad![i]!, e, `оп 9 dW2[${String(i)}]`))
    flatten(g9['∂L/∂b2']!).forEach((e, i) => expectClose(model.b2.grad![i]!, e, `оп 9 db2[${String(i)}]`))
    flatten(g9['∂L/∂a1']!).forEach((e, i) => expectClose(t.a1!.grad![i]!, e, `оп 9 da1[${String(i)}]`))
    cursor.advance() // 10: tanh-grad
    flatten(ETALON_SAMPLE_1[10]!.outputs as number[]).forEach((e, i) => expectClose(t.z1!.grad![i]!, e, `оп 10 dz1[${String(i)}]`))
    cursor.advance() // 11: matvec-grad L1
    const g11 = ETALON_SAMPLE_1[11]!.grads!
    flatten(g11['∂L/∂W1']!).forEach((e, i) => expectClose(model.W1.grad![i]!, e, `оп 11 dW1[${String(i)}]`))
    flatten(g11['∂L/∂b1']!).forEach((e, i) => expectClose(model.b1.grad![i]!, e, `оп 11 db1[${String(i)}]`))
    flatten(g11['∂L/∂x']!).forEach((e, i) => expectClose(cursor.x.grad![i]!, e, `оп 11 dx[${String(i)}]`))
  })

  it('sgd-оп 12: все параметры обновлены по W = W − η·∂L/∂W (из контрольных градиентов)', () => {
    const model = new MLP(XOR_SCENARIO.startWeights)
    const sample = XOR_SCENARIO.samples[0]!
    const cursor = new SampleCursor(model, sample.x, sample.y, XOR_SCENARIO.lr)
    while (!cursor.done) cursor.advance()
    const g11 = ETALON_SAMPLE_1[11]!.grads!
    const g9 = ETALON_SAMPLE_1[9]!.grads!
    const lr = XOR_SCENARIO.lr
    flatten(g11['∂L/∂W1']!).forEach((g, i) => expectClose(model.W1.data[i]!, XOR_SCENARIO.startWeights.w1.flat()[i]! - lr * g, `W1[${String(i)}]`))
    flatten(g11['∂L/∂b1']!).forEach((g, i) => expectClose(model.b1.data[i]!, XOR_SCENARIO.startWeights.b1[i]! - lr * g, `b1[${String(i)}]`))
    flatten(g9['∂L/∂W2']!).forEach((g, i) => expectClose(model.W2.data[i]!, XOR_SCENARIO.startWeights.w2.flat()[i]! - lr * g, `W2[${String(i)}]`))
    flatten(g9['∂L/∂b2']!).forEach((g, i) => expectClose(model.b2.data[i]!, XOR_SCENARIO.startWeights.b2[i]! - lr * g, `b2[${String(i)}]`))
    // контрольное «до → после» W2[0,0]
    const sgd = ETALON_SAMPLE_1[12]!.outputs as number[]
    expectClose(model.W2.data[0]!, sgd[1]!, 'W2[0,0] после sgd')
  })
})

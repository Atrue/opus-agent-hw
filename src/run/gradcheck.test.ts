import { describe, expect, it } from 'vitest'
import { NEURON_SCENARIO } from './scenario'
import { flatWeights } from './stepRecords'
import { buildModel, SampleCursor, type ModelSpec } from '../tensor'

/**
 * Central-difference gradcheck (NFR-02, методология torch.autograd.gradcheck):
 * численная производная ∂L/∂θ = (L(θ+h) − L(θ−h)) / 2h НЕ использует
 * аналитические формулы движка — независимая проверка знаков и формул
 * градиентов сценария «один нейрон» (сэмпл 1, стартовые веса). Исполняется
 * ДО фиксации эталон-констант: двухступенчатая честность против
 * самозамкнутого эталона (снял с движка → сверил движком).
 */

const H = 1e-6
const TOL = 1e-4

/** Индекс bce-опы в walked-порядке (3 forward-опы на слой). */
const LOSS_OP = 3 * NEURON_SCENARIO.net.length
/** Индекс последней градиентной опы (affine-grad слоя 0) — после неё
 *  аналитические ∂L/∂θ параметров готовы. */
const GRADS_DONE_OP = NEURON_SCENARIO.ops.length - 2

/** Спец с персёрбированным плоским весом (раскладка flatWeights: W1, b1). */
function specWithFlatWeight(flatIndex: number, value: number): ModelSpec {
  const flat = flatWeights(buildModel(NEURON_SCENARIO))
  flat[flatIndex] = value
  const units = NEURON_SCENARIO.net[0]!.units
  const inputs = NEURON_SCENARIO.net[0]!.inputs
  const w1: number[][] = []
  for (let j = 0; j < units; j++) w1.push(flat.slice(j * inputs, (j + 1) * inputs))
  return {
    net: NEURON_SCENARIO.net,
    loss: NEURON_SCENARIO.loss,
    startWeights: { w1, b1: flat.slice(units * inputs) },
  }
}

/** Лосс сэмпла 1 на пересобранном графе (прогон до bce-опы включительно). */
function lossOf(spec: ModelSpec): number {
  const model = buildModel(spec)
  const sample = NEURON_SCENARIO.samples[0]!
  const cursor = new SampleCursor(model, sample.x, sample.y, NEURON_SCENARIO.lr)
  for (let op = 0; op <= LOSS_OP; op++) cursor.advance()
  return cursor.tensors.L!.data[0]!
}

/** Численная ∂L/∂θ central difference (без аналитических формул движка). */
function numGrad(flatIndex: number, orig: number): number {
  return (lossOf(specWithFlatWeight(flatIndex, orig + H)) - lossOf(specWithFlatWeight(flatIndex, orig - H))) / (2 * H)
}

describe('gradcheck: численная vs аналитическая производная (один нейрон, сэмпл 1)', () => {
  it('∂L/∂W[0], ∂L/∂W[1], ∂L/∂b: |аналитическая − численная| ≤ 1e-4·max(1, |численная|)', () => {
    const model = buildModel(NEURON_SCENARIO)
    const sample = NEURON_SCENARIO.samples[0]!
    const cursor = new SampleCursor(model, sample.x, sample.y, NEURON_SCENARIO.lr)
    for (let op = 0; op <= GRADS_DONE_OP; op++) cursor.advance()
    expect(model.weights[0]!.grad, '∂L/∂W вычислены').not.toBeNull()
    expect(model.biases[0]!.grad, '∂L/∂b вычислены').not.toBeNull()
    const analytic = [...Array.from(model.weights[0]!.grad!), ...Array.from(model.biases[0]!.grad!)]
    const orig = flatWeights(model)
    expect(analytic).toHaveLength(orig.length)
    expect(orig.length, 'нейрон: 2 веса + биас').toBe(3)
    for (let i = 0; i < orig.length; i++) {
      const numeric = numGrad(i, orig[i]!)
      expect(
        Math.abs(analytic[i]! - numeric),
        `параметр #${String(i)}: |${String(analytic[i])} − ${String(numeric)}| ≤ ${String(TOL * Math.max(1, Math.abs(numeric)))}`,
      ).toBeLessThanOrEqual(TOL * Math.max(1, Math.abs(numeric)))
    }
  })

  it('знаки согласованы: численная и аналитическая производные одного знака (ненулевые)', () => {
    const model = buildModel(NEURON_SCENARIO)
    const sample = NEURON_SCENARIO.samples[0]!
    const cursor = new SampleCursor(model, sample.x, sample.y, NEURON_SCENARIO.lr)
    for (let op = 0; op <= GRADS_DONE_OP; op++) cursor.advance()
    const analytic = [...Array.from(model.weights[0]!.grad!), ...Array.from(model.biases[0]!.grad!)]
    const orig = flatWeights(model)
    for (let i = 0; i < orig.length; i++) {
      const numeric = numGrad(i, orig[i]!)
      expect(numeric, `параметр #${String(i)}: численная производная ненулевая`).not.toBe(0)
      expect(Math.sign(analytic[i]!), `параметр #${String(i)}: знаки совпадают`).toBe(Math.sign(numeric))
    }
  })
})

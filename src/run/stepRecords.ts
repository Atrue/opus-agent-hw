/**
 * Снимки операций в StepRecord (D-28б/D-30): buildStepRecord собирается из
 * метаданных ops спека (формула/нарратив/провенанс) и walked-опы курсора —
 * без сценарного switch. Входы/выходы/градиенты копируются из живых тензоров
 * в момент записи (заморозка чисел — поздний opt.step() не испортит историю,
 * R1 §2.2). Provenance-строки RU — константы модуля: на них завязаны
 * etalon-тест и UI.
 */

import { gradIo, tensorIo, type Phase, type SampleCursor, type StepRecord, type Tensor, type TensorIo } from '../tensor'
import { activeScenario, type ScenarioModel } from './scenario'

const PROV_WEIGHT = 'вес модели (стартовые константы сценария)'
const PROV_INPUT = 'входные данные — граница графа'
const PROV_TARGET = 'метка — граница графа'
const PROV_LR = 'гиперпараметр SGD'

function stepProv(opIndex: number, spec: ScenarioModel): string {
  return `шаг ${String(opIndex + 1)} (${spec.ops[opIndex]!.op})`
}

function scalarIo(sym: string, values: readonly number[], provenance?: string): TensorIo {
  const io: TensorIo = { sym, shape: [values.length], values: [...values] }
  if (provenance !== undefined) io.provenance = provenance
  return io
}

/** Снимок градиента вектора [n] как number[] (t.grad уже вычислен). */
function gradVec(t: Tensor): number[] {
  if (t.grad === null) throw new Error(`gradVec: у тензора [${t.shape.join(',')}] нет градиента`)
  return Array.from(t.grad)
}

/** ASCII-ключ changed-маркера: «ŷ» → «yhat» (соответствие normalizeSym UI). */
function ascii(sym: string): string {
  return sym.replace('ŷ', 'yhat')
}

/** «∂L/∂ŷ» → «dyhat» — changed-маркер градиентного символа. */
function dAscii(sym: string): string {
  return `d${ascii(sym)}`
}

/** Плоские веса модели в порядке снапшота (layer-major): W1, b1, W2, b2… */
export function flatWeights(m: { weights: readonly Tensor[]; biases: readonly Tensor[] }): number[] {
  const out: number[] = []
  for (let k = 0; k < m.weights.length; k++) {
    out.push(...Array.from(m.weights[k]!.data), ...Array.from(m.biases[k]!.data))
  }
  return out
}

/**
 * Снимок выполненной операции opIndex в StepRecord: входы/выходы/градиенты
 * копируются из живых тензоров курсора в момент записи. Символы —
 * рендер-метки слоёв спека (render.layerSymbols); индексы шагов provenance
 * выведены из топологии walked-оп (buildWalk).
 */
export function buildStepRecord(cursor: SampleCursor, opIndex: number, spec: ScenarioModel = activeScenario()): StepRecord {
  const meta = spec.ops[opIndex]!
  const walk = cursor.walk[opIndex]!
  const t = cursor.tensors
  const m = cursor.model
  const K = m.layers.length
  const L = spec.render.layerSymbols
  const base = {
    index: opIndex,
    op: meta.op,
    layer: meta.layer,
    phase: meta.phase,
    formula: meta.formula,
    narrative: { ru: meta.narrative },
  }
  // индексы walked-оп (зеркало buildWalk): forward 3 на слой, loss, bce-grad,
  // backward парами от выхода, sgd
  const actIdx = (k: number): number => 3 * k + 2
  const actGradIdx = (k: number): number => 3 * K + 2 + 2 * (K - 1 - k)
  const affGradIdx = (k: number): number => 3 * K + 3 + 2 * (K - 1 - k)
  switch (walk.kind) {
    case 'matvec': {
      const k = walk.layer
      const input = k === 0 ? tensorIo('x', cursor.x, PROV_INPUT) : tensorIo(L[k - 1]!.h, t.h[k - 1]!, stepProv(actIdx(k - 1), spec))
      return {
        ...base,
        inputs: [tensorIo(L[k]!.w, m.weights[k]!, PROV_WEIGHT), input],
        outputs: tensorIo(L[k]!.z, t.zPre[k]!),
        grads: null,
        changed: [ascii(L[k]!.z)],
      }
    }
    case 'add': {
      const k = walk.layer
      return {
        ...base,
        inputs: [tensorIo(L[k]!.z, t.zPre[k]!, stepProv(3 * k, spec)), tensorIo(L[k]!.b, m.biases[k]!, PROV_WEIGHT)],
        outputs: tensorIo(L[k]!.z, t.zPost[k]!),
        grads: null,
        changed: [ascii(L[k]!.z)],
      }
    }
    case 'activate': {
      const k = walk.layer
      return {
        ...base,
        inputs: [tensorIo(L[k]!.z, t.zPost[k]!, stepProv(3 * k + 1, spec))],
        outputs: tensorIo(L[k]!.h, t.h[k]!),
        grads: null,
        changed: [ascii(L[k]!.h)],
      }
    }
    case 'loss':
      return {
        ...base,
        inputs: [tensorIo(L[K - 1]!.h, t.h[K - 1]!, stepProv(actIdx(K - 1), spec)), tensorIo('y', cursor.y, PROV_TARGET)],
        outputs: tensorIo('L', t.L!),
        grads: null,
        changed: ['L'],
      }
    case 'bce-grad': {
      const dOut = gradVec(t.h[K - 1]!)
      const sym = `∂L/∂${L[K - 1]!.h}`
      return {
        ...base,
        inputs: [tensorIo(L[K - 1]!.h, t.h[K - 1]!, stepProv(actIdx(K - 1), spec)), tensorIo('y', cursor.y, PROV_TARGET)],
        outputs: scalarIo(sym, dOut),
        grads: { [sym]: dOut },
        changed: [dAscii(L[K - 1]!.h)],
      }
    }
    case 'activate-grad': {
      const k = walk.layer
      const dz = gradVec(t.zPost[k]!)
      const sym = `∂L/∂${L[k]!.z}`
      const upFrom = k === K - 1 ? 3 * K + 1 : affGradIdx(k + 1)
      return {
        ...base,
        inputs: [scalarIo(`∂L/∂${L[k]!.h}`, gradVec(t.h[k]!), stepProv(upFrom, spec))],
        outputs: scalarIo(sym, dz),
        grads: { [sym]: dz },
        changed: [dAscii(L[k]!.z)],
      }
    }
    case 'affine-grad': {
      const k = walk.layer
      const layer = m.layers[k]!
      const dW = gradIo(`∂L/∂${L[k]!.w}`, m.weights[k]!)
      const inputSym = k === 0 ? 'x' : L[k - 1]!.h
      const input =
        k === 0 ? tensorIo('x', cursor.x, PROV_INPUT) : tensorIo(L[k - 1]!.h, t.h[k - 1]!, stepProv(actIdx(k - 1), spec))
      return {
        ...base,
        inputs: [scalarIo(`∂L/∂${L[k]!.z}`, gradVec(t.zPost[k]!), stepProv(actGradIdx(k), spec)), input],
        outputs: { sym: `∂L/∂${L[k]!.w}`, shape: [layer.units, layer.inputs], values: dW },
        grads: {
          [`∂L/∂${L[k]!.w}`]: dW,
          [`∂L/∂${L[k]!.b}`]: gradVec(m.biases[k]!),
          [`∂L/∂${inputSym}`]: gradVec(k === 0 ? cursor.x : t.h[k - 1]!),
        },
        changed: [dAscii(L[k]!.w), dAscii(L[k]!.b), dAscii(inputSym)],
      }
    }
    case 'sgd': {
      const wOut = m.weights[K - 1]!
      const before = cursor.sgdBefore ?? wOut.data[0]!
      const ref = `${L[K - 1]!.w}[0,0]`
      return {
        ...base,
        inputs: [
          scalarIo(ref, [before], PROV_WEIGHT),
          scalarIo(`∂L/∂${ref}`, [wOut.grad![0]!], stepProv(affGradIdx(K - 1), spec)),
          scalarIo('η', [cursor.lr], PROV_LR),
        ],
        outputs: scalarIo(ref, [before, wOut.data[0]!]),
        grads: null,
        changed: ['W'],
      }
    }
  }
}

/** Текущая фаза для бейджа (до первого шага — фаза предстоящей операции). */
export function currentPhase(record: StepRecord | null): Phase {
  return record?.phase ?? activeScenario().ops[0]!.phase
}

/** Ключевое число операции для ленты шагов (D-25): первый элемент выхода
 *  (sgd — последний: значение после update-опы). */
export function firstOpValue(record: StepRecord): number {
  const flat = Array.isArray(record.outputs.values[0])
    ? (record.outputs.values as number[][]).flat()
    : (record.outputs.values as number[])
  return record.op === 'sgd' ? flat[flat.length - 1]! : flat[0]!
}

/**
 * Снимки операций в StepRecord (D-28б): buildStepRecord копирует входы/выходы/
 * градиенты из живых тензоров курсора в момент записи (заморозка чисел —
 * поздний opt.step() не испортит историю, R1 §2.2). Provenance-строки RU
 * переносятся дословно — на них завязаны etalon-тест и UI.
 */

import { gradIo, tensorIo, type MLP, type Phase, type SampleCursor, type StepRecord, type Tensor, type TensorIo } from '../tensor'
import { XOR_SCENARIO } from './scenario'

const PROV_WEIGHT = 'вес модели (стартовые константы сценария)'
const PROV_INPUT = 'входные данные — граница графа'
const PROV_TARGET = 'метка — граница графа'
const PROV_LR = 'гиперпараметр SGD'

function stepProv(opIndex: number): string {
  return `шаг ${String(opIndex + 1)} (${XOR_SCENARIO.opMeta[opIndex]!.op})`
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

/** Плоские 13 весов модели в порядке снапшота: W1 (6), b1 (3), W2 (3), b2 (1). */
export function flatWeights(m: MLP): number[] {
  return [...Array.from(m.W1.data), ...Array.from(m.b1.data), ...Array.from(m.W2.data), ...Array.from(m.b2.data)]
}

/**
 * Снимок выполненной операции opIndex в StepRecord: входы/выходы/градиенты
 * копируются из живых тензоров курсора в момент записи (заморозка чисел —
 * поздний opt.step() не испортит историю, R1 §2.2).
 */
export function buildStepRecord(cursor: SampleCursor, opIndex: number): StepRecord {
  const meta = XOR_SCENARIO.opMeta[opIndex]!
  const t = cursor.tensors
  const m = cursor.model
  const base = {
    index: opIndex,
    op: meta.op,
    layer: meta.layer,
    phase: meta.phase,
    formula: meta.formula,
    narrative: { ru: meta.narrative },
  }
  switch (opIndex) {
    case 0:
      return {
        ...base,
        inputs: [tensorIo('W1', m.W1, PROV_WEIGHT), tensorIo('x', cursor.x, PROV_INPUT)],
        outputs: tensorIo('z1', t.z1p!),
        grads: null,
        changed: ['z1'],
      }
    case 1:
      return {
        ...base,
        inputs: [tensorIo('z1', t.z1p!, stepProv(0)), tensorIo('b1', m.b1, PROV_WEIGHT)],
        outputs: tensorIo('z1', t.z1!),
        grads: null,
        changed: ['z1'],
      }
    case 2:
      return {
        ...base,
        inputs: [tensorIo('z1', t.z1!, stepProv(1))],
        outputs: tensorIo('a1', t.a1!),
        grads: null,
        changed: ['a1'],
      }
    case 3:
      return {
        ...base,
        inputs: [tensorIo('W2', m.W2, PROV_WEIGHT), tensorIo('a1', t.a1!, stepProv(2))],
        outputs: tensorIo('z2', t.z2p!),
        grads: null,
        changed: ['z2'],
      }
    case 4:
      return {
        ...base,
        inputs: [tensorIo('z2', t.z2p!, stepProv(3)), tensorIo('b2', m.b2, PROV_WEIGHT)],
        outputs: tensorIo('z2', t.z2!),
        grads: null,
        changed: ['z2'],
      }
    case 5:
      return {
        ...base,
        inputs: [tensorIo('z2', t.z2!, stepProv(4))],
        outputs: tensorIo('ŷ', t.yhat!),
        grads: null,
        changed: ['yhat'],
      }
    case 6:
      return {
        ...base,
        inputs: [tensorIo('ŷ', t.yhat!, stepProv(5)), tensorIo('y', cursor.y, PROV_TARGET)],
        outputs: tensorIo('L', t.L!),
        grads: null,
        changed: ['L'],
      }
    case 7: {
      const dyhat = gradVec(t.yhat!)
      return {
        ...base,
        inputs: [tensorIo('ŷ', t.yhat!, stepProv(5)), tensorIo('y', cursor.y, PROV_TARGET)],
        outputs: scalarIo('∂L/∂ŷ', dyhat),
        grads: { '∂L/∂ŷ': dyhat },
        changed: ['dyhat'],
      }
    }
    case 8: {
      const dz2 = gradVec(t.z2!)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂ŷ', gradVec(t.yhat!), stepProv(7))],
        outputs: scalarIo('∂L/∂z2', dz2),
        grads: { '∂L/∂z2': dz2 },
        changed: ['dz2'],
      }
    }
    case 9: {
      const dW2 = gradIo('∂L/∂W2', m.W2)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂z2', gradVec(t.z2!), stepProv(8)), tensorIo('a1', t.a1!, stepProv(2))],
        outputs: { sym: '∂L/∂W2', shape: [1, 3], values: dW2 },
        grads: {
          '∂L/∂W2': dW2,
          '∂L/∂b2': gradVec(m.b2),
          '∂L/∂a1': gradVec(t.a1!),
        },
        changed: ['dW2', 'db2', 'da1'],
      }
    }
    case 10: {
      const dz1 = gradVec(t.z1!)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂a1', gradVec(t.a1!), stepProv(9))],
        outputs: scalarIo('∂L/∂z1', dz1),
        grads: { '∂L/∂z1': dz1 },
        changed: ['dz1'],
      }
    }
    case 11: {
      const dW1 = gradIo('∂L/∂W1', m.W1)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂z1', gradVec(t.z1!), stepProv(10)), tensorIo('x', cursor.x, PROV_INPUT)],
        outputs: { sym: '∂L/∂W1', shape: [3, 2], values: dW1 },
        grads: {
          '∂L/∂W1': dW1,
          '∂L/∂b1': gradVec(m.b1),
          '∂L/∂x': gradVec(cursor.x),
        },
        changed: ['dW1', 'db1', 'dx'],
      }
    }
    case 12: {
      const before = cursor.sgdBefore ?? m.W2.data[0]!
      return {
        ...base,
        inputs: [
          scalarIo('W2[0,0]', [before], PROV_WEIGHT),
          scalarIo('∂L/∂W2[0,0]', [m.W2.grad![0]!], stepProv(9)),
          scalarIo('η', [cursor.lr], PROV_LR),
        ],
        outputs: scalarIo('W2[0,0]', [before, m.W2.data[0]!]),
        grads: null,
        changed: ['W'],
      }
    }
    default:
      throw new Error(`buildStepRecord: неизвестная операция ${String(opIndex)}`)
  }
}

/** Текущая фаза для бейджа (до первого шага — фаза предстоящей операции). */
export function currentPhase(record: StepRecord | null): Phase {
  return record?.phase ?? XOR_SCENARIO.opMeta[0]!.phase
}

/** Ключевое число операции для ленты шагов (D-25): первый элемент выхода
 *  (sgd — последний: значение после update-опы). */
export function firstOpValue(record: StepRecord): number {
  const flat = Array.isArray(record.outputs.values[0])
    ? (record.outputs.values as number[][]).flat()
    : (record.outputs.values as number[])
  return record.op === 'sgd' ? flat[flat.length - 1]! : flat[0]!
}

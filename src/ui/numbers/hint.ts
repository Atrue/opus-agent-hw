/**
 * Контент tier-1 подсказок NumberHint (перенос из hintData.ts телом, D-34):
 * значение + формула с подстановкой (скалярные раскрытия экспандеров
 * 01.1-02 над снапшотами записи шага) + градиент ∂L/∂sym при наличии.
 * Тултип ≠ замена drill: контент анонсирует, полный разбор — клик.
 */

import { run } from '../../run/run'
import { expandScalar, type LazyExpansion, type Operand, type StepRecord, type TensorValues } from '../../tensor'
import { flattenTensorValues, resolveRef } from './resolve'

export interface HintData {
  sym: string
  value: number
  /** Формула с подстановкой из экспандеров (скалярное раскрытие) — при наличии. */
  formula: string | null
  /** Градиент ∂L/∂sym с тем же индексом — при наличии в записи шага. */
  gradient: number | null
  /** Дополнительная строка-контекст (например, «эпоха 2» в таблице весов). */
  note: string | null
}

const GRAD_PREFIX = '∂L/∂'

function indexOf(ref: string): number {
  const m = /^(.+)\[(\d+)\]$/.exec(ref)
  return m ? Number(m[2]) : 0
}

function at(values: readonly number[], i: number): number {
  return values[Math.min(Math.max(i, 0), values.length - 1)]!
}

/** Снапшот символа из записи: inputs → outputs → grads (замороженные числа). */
function snapshotOf(record: StepRecord, sym: string): TensorValues | null {
  const input = record.inputs.find((io) => io.sym === sym)
  if (input !== undefined) return input.values
  if (record.outputs.sym === sym) return record.outputs.values
  if (record.grads !== null && sym in record.grads) return record.grads[sym]!
  return null
}

/** Скалярное раскрытие ВЫХОДА текущей операции (формула с подстановкой).
 *  Операнды — снапшоты самой записи: числа формулы соответствуют шагу в
 *  точности (включая «до»-значение sgd-обновления). Символы — layerSymbols
 *  активного сценария (D-30): один код служит XOR и «одному нейрону». */
function expandOutput(record: StepRecord, flatIndex: number): LazyExpansion | null {
  const L = run.scenario.render.layerSymbols
  const K = L.length
  // meta.layer — 1-based номер слоя (sgd: 0 — особый случай ниже)
  const k = record.layer - 1
  const operand = (sym: string): Operand | null => {
    const values = snapshotOf(record, sym)
    return values === null ? null : { sym, get: () => values }
  }
  const need = (...syms: string[]): Operand[] | null => {
    const ops = syms.map(operand)
    return ops.some((o) => o === null) ? null : (ops as Operand[])
  }
  const inputSym = (layer: number): string => (layer === 0 ? 'x' : L[layer - 1]!.h)
  switch (record.op) {
    case 'matvec': {
      const o = need(L[k]!.w, inputSym(k))
      return o === null ? null : expandScalar({ kind: 'matvec', w: o[0]!, x: o[1]!, row: flatIndex })
    }
    case 'add': {
      const o = need(L[k]!.z, L[k]!.b)
      return o === null ? null : expandScalar({ kind: 'add', a: o[0]!, b: o[1]!, index: flatIndex })
    }
    case 'tanh': {
      const o = need(L[k]!.z)
      return o === null ? null : expandScalar({ kind: 'tanh', z: o[0]!, index: flatIndex })
    }
    case 'sigmoid': {
      const o = need(L[k]!.z)
      return o === null ? null : expandScalar({ kind: 'sigmoid', z: o[0]!, index: flatIndex })
    }
    case 'bce': {
      const o = need(L[K - 1]!.h, 'y')
      return o === null ? null : expandScalar({ kind: 'bce', p: o[0]!, t: o[1]! })
    }
    case 'bce-grad': {
      const o = need(L[K - 1]!.h, 'y')
      return o === null ? null : expandScalar({ kind: 'bce-grad', p: o[0]!, t: o[1]! })
    }
    case 'tanh-grad': {
      const o = need(L[k]!.h, `∂L/∂${L[k]!.h as string}`)
      return o === null ? null : expandScalar({ kind: 'tanh-grad', a: o[0]!, gOut: o[1]!, index: flatIndex })
    }
    case 'sigmoid-grad': {
      const o = need(L[k]!.h, `∂L/∂${L[k]!.h as string}`)
      return o === null ? null : expandScalar({ kind: 'sigmoid-grad', out: o[0]!, gOut: o[1]!, index: flatIndex })
    }
    case 'matvec-grad': {
      // выход ∂L/∂W [units, inputs]: плоский индекс → row/col по форме слоя
      const o = need(`∂L/∂${L[k]!.z as string}`, inputSym(k))
      if (o === null) return null
      const inputs = record.outputs.shape[1] ?? 1
      return expandScalar({ kind: 'matvec-grad-w', gOut: o[0]!, x: o[1]!, row: Math.floor(flatIndex / inputs), col: flatIndex % inputs })
    }
    case 'sgd': {
      const wSym = L[K - 1]!.w
      const before = snapshotOf(record, `${wSym}[0,0]`)
      const grad = snapshotOf(record, `∂L/∂${wSym}[0,0]`)
      const lr = snapshotOf(record, 'η')
      if (before === null || grad === null || lr === null) return null
      const w: Operand = { sym: wSym, get: () => flattenTensorValues(before) }
      const g: Operand = { sym: `∂L/∂${wSym}`, get: () => flattenTensorValues(grad) }
      return expandScalar({ kind: 'sgd', w, g, lr: flattenTensorValues(lr)[0]!, index: 0 })
    }
    default:
      return null
  }
}

/** Контент tier 1 для ref: значение (resolveRef) + формула (выход операции)
 *  + градиент ∂L/∂sym при наличии. null — данных нет, тултип не показываем. */
export function buildHintData(record: StepRecord | null, ref: string): HintData | null {
  if (record === null) return null
  const resolved = resolveRef(record, ref)
  if (resolved === null) return null
  const i = indexOf(ref)
  const formula = resolved.sym === record.outputs.sym ? (expandOutput(record, i)?.formula ?? null) : null
  const gradValues =
    record.grads !== null && resolved.sym !== record.outputs.sym
      ? record.grads[`${GRAD_PREFIX}${resolved.sym}`]
      : undefined
  const gradient = gradValues === undefined ? null : at(flattenTensorValues(gradValues), i)
  return { sym: resolved.sym, value: resolved.value, formula, gradient, note: null }
}

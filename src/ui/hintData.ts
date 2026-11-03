/**
 * Data-слой tier-1 подсказок (R5 §4.5) — без React-компонент (fast-refresh):
 * resolveRef (переиспользуется NumberDrilldown tier 2) + построение контента
 * тултипа NumberHint: значение + формула с подстановкой (скалярные раскрытия
 * экспандеров 01.1-02 над снапшотами записи шага) + градиент ∂L/∂sym при
 * наличии. Тултип ≠ замена drill: контент анонсирует, полный разбор — клик.
 */

import { run } from '../run/runState'
import type { LazyExpansion, Operand, StepRecord, TensorValues } from '../tensor'
import { expandScalar } from '../tensor'

const PROV_WEIGHT = 'вес модели (живое значение)'
const PROV_INPUT = 'входные данные — граница графа'
const PROV_TARGET = 'метка — граница графа'

export interface ResolvedNumber {
  sym: string
  value: number
  provenance: string
}

export function flattenTensorValues(values: TensorValues): number[] {
  const first = values[0]
  if (Array.isArray(first)) return (values as number[][]).flat()
  return [...(values as number[])]
}

/** Живые глобальные тензоры прогона: веса модели + вход/метка активного сэмпла. */
function globalTensors(): Record<string, { values: TensorValues; provenance: string }> {
  const cursor = run.activeCursor
  return {
    W1: { values: matrixRowsOf(run.model.W1.data, run.model.W1.shape[0]!), provenance: PROV_WEIGHT },
    b1: { values: Array.from(run.model.b1.data), provenance: PROV_WEIGHT },
    W2: { values: matrixRowsOf(run.model.W2.data, run.model.W2.shape[0]!), provenance: PROV_WEIGHT },
    b2: { values: Array.from(run.model.b2.data), provenance: PROV_WEIGHT },
    x: { values: Array.from(cursor.x.data), provenance: PROV_INPUT },
    y: { values: Array.from(cursor.y.data), provenance: PROV_TARGET },
  }
}

/** Float64Array [rows*cols] → вложенные строки (как tensorValuesOf записи). */
function matrixRowsOf(data: Float64Array, rows: number): number[][] {
  const cols = data.length / rows
  const out: number[][] = []
  for (let j = 0; j < rows; j++) out.push(Array.from(data.subarray(j * cols, (j + 1) * cols)))
  return out
}

/** Разрешение ref → число: текущая запись (grads → outputs → inputs), затем
 *  живые глобальные тензоры прогона. Только lookup, без вычислений. */
export function resolveRef(record: StepRecord, ref: string): ResolvedNumber | null {
  const m = /^(.+)\[(\d+)\]$/.exec(ref)
  const sym = m ? m[1]! : ref
  const index = m ? Number(m[2]) : 0

  const stepProvenance = `шаг ${record.index + 1} (${record.op})`
  const local: { values: TensorValues; provenance: string }[] = []
  if (record.grads !== null && sym in record.grads) local.push({ values: record.grads[sym]!, provenance: stepProvenance })
  if (record.outputs.sym === sym) local.push({ values: record.outputs.values, provenance: stepProvenance })
  const input = record.inputs.find((i) => i.sym === sym)
  if (input !== undefined) local.push({ values: input.values, provenance: input.provenance ?? stepProvenance })

  if (local.length > 0) {
    const all = flattenTensorValues(local[0]!.values)
    const i = Math.min(Math.max(index, 0), all.length - 1)
    return { sym, value: all[i]!, provenance: local[0]!.provenance }
  }
  const globalEntry = globalTensors()[sym]
  if (globalEntry === undefined) return null
  const all = flattenTensorValues(globalEntry.values)
  const i = Math.min(Math.max(index, 0), all.length - 1)
  return { sym, value: all[i]!, provenance: globalEntry.provenance }
}

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
 *  точности (включая «до»-значение sgd-обновления). */
function expandOutput(record: StepRecord, flatIndex: number): LazyExpansion | null {
  const operand = (sym: string): Operand | null => {
    const values = snapshotOf(record, sym)
    return values === null ? null : { sym, get: () => values }
  }
  const need = (...syms: string[]): Operand[] | null => {
    const ops = syms.map(operand)
    return ops.some((o) => o === null) ? null : (ops as Operand[])
  }
  const key = `${record.op}:${String(record.layer)}`
  switch (key) {
    case 'matvec:1': {
      const o = need('W1', 'x')
      return o === null ? null : expandScalar({ kind: 'matvec', w: o[0]!, x: o[1]!, row: flatIndex })
    }
    case 'add:1': {
      const o = need('z1', 'b1')
      return o === null ? null : expandScalar({ kind: 'add', a: o[0]!, b: o[1]!, index: flatIndex })
    }
    case 'tanh:1': {
      const o = need('z1')
      return o === null ? null : expandScalar({ kind: 'tanh', z: o[0]!, index: flatIndex })
    }
    case 'matvec:2': {
      const o = need('W2', 'a1')
      return o === null ? null : expandScalar({ kind: 'matvec', w: o[0]!, x: o[1]!, row: flatIndex })
    }
    case 'add:2': {
      const o = need('z2', 'b2')
      return o === null ? null : expandScalar({ kind: 'add', a: o[0]!, b: o[1]!, index: flatIndex })
    }
    case 'sigmoid:2': {
      const o = need('z2')
      return o === null ? null : expandScalar({ kind: 'sigmoid', z: o[0]!, index: flatIndex })
    }
    case 'bce:2': {
      const o = need('ŷ', 'y')
      return o === null ? null : expandScalar({ kind: 'bce', p: o[0]!, t: o[1]! })
    }
    case 'bce-grad:2': {
      const o = need('ŷ', 'y')
      return o === null ? null : expandScalar({ kind: 'bce-grad', p: o[0]!, t: o[1]! })
    }
    case 'sigmoid-grad:2': {
      const o = need('ŷ', '∂L/∂ŷ')
      return o === null ? null : expandScalar({ kind: 'sigmoid-grad', out: o[0]!, gOut: o[1]!, index: flatIndex })
    }
    case 'matvec-grad:2': {
      // выход ∂L/∂W2 [1,3]: плоский индекс = col (row всегда 0)
      const o = need('∂L/∂z2', 'a1')
      return o === null ? null : expandScalar({ kind: 'matvec-grad-w', gOut: o[0]!, x: o[1]!, row: 0, col: flatIndex })
    }
    case 'tanh-grad:1': {
      const o = need('a1', '∂L/∂a1')
      return o === null ? null : expandScalar({ kind: 'tanh-grad', a: o[0]!, gOut: o[1]!, index: flatIndex })
    }
    case 'matvec-grad:1': {
      // выход ∂L/∂W1 [3,2]: плоский индекс k → row k>>1, col k&1
      const o = need('∂L/∂z1', 'x')
      return o === null
        ? null
        : expandScalar({ kind: 'matvec-grad-w', gOut: o[0]!, x: o[1]!, row: flatIndex >> 1, col: flatIndex & 1 })
    }
    case 'sgd:0': {
      const before = snapshotOf(record, 'W2[0,0]')
      const grad = snapshotOf(record, '∂L/∂W2[0,0]')
      const lr = snapshotOf(record, 'η')
      if (before === null || grad === null || lr === null) return null
      const w: Operand = { sym: 'W2', get: () => flattenTensorValues(before) }
      const g: Operand = { sym: '∂L/∂W2', get: () => flattenTensorValues(grad) }
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

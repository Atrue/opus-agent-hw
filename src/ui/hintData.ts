/**
 * Data-слой tier-1 подсказок (R5 §4.5) — без React-компонент (fast-refresh):
 * resolveRef (переиспользуется NumberDrilldown tier 2) + построение контента
 * тултипа NumberHint: значение + формула с подстановкой (скалярные раскрытия
 * экспандеров 01.1-02 над снапшотами записи шага) + градиент ∂L/∂sym при
 * наличии. Тултип ≠ замена drill: контент анонсирует, полный разбор — клик.
 */

import { run } from '../run/run'
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

/** Живые глобальные тензоры прогона: веса модели (символы — render-метки
 *  слоёв спека) + вход/метка активного сэмпла. */
function globalTensors(): Record<string, { values: TensorValues; provenance: string }> {
  const cursor = run.activeCursor
  const out: Record<string, { values: TensorValues; provenance: string }> = {
    x: { values: Array.from(cursor.x.data), provenance: PROV_INPUT },
    y: { values: Array.from(cursor.y.data), provenance: PROV_TARGET },
  }
  const syms = run.scenario.render.layerSymbols
  for (let k = 0; k < run.model.weights.length; k++) {
    const w = run.model.weights[k]!
    const b = run.model.biases[k]!
    out[syms[k]!.w] = { values: matrixRowsOf(w.data, w.shape[0]!), provenance: PROV_WEIGHT }
    out[syms[k]!.b] = { values: Array.from(b.data), provenance: PROV_WEIGHT }
  }
  return out
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

/**
 * Разрешение ref → число (перенос из hintData.ts телом, D-34): текущая
 * запись шага (grads → outputs → inputs), затем живые глобальные тензоры
 * прогона. Только lookup, без вычислений; переиспользуется NumberDrilldown
 * (tier 2) и тултипами NumberHint (tier 1). Без React (fast-refresh-safe).
 */

import { run } from '../../run/run'
import type { StepRecord, TensorValues } from '../../tensor'

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

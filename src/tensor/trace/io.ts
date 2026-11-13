/**
 * Снапшот-хелперы записи walkthrough (перенос из trace.ts телом, D-34):
 * заморозка чисел живого тензора/градиента в plain-массивы в момент записи —
 * связная группа одного субъекта (запись StepRecord).
 */

import { Tensor } from '../tensor'
import type { TensorIo, TensorValues } from './types'

/** Снимок значений тензора в plain-массивы (заморозка чисел в момент записи). */
export function tensorValuesOf(t: Tensor): TensorValues {
  if (t.shape.length === 1) return Array.from(t.data)
  const rows = t.shape[0]!
  const cols = t.shape[1]!
  const out: number[][] = []
  for (let j = 0; j < rows; j++) out.push(Array.from(t.data.subarray(j * cols, (j + 1) * cols)))
  return out
}

/** Строит TensorIo из живого тензора (копия чисел — запись неизменяема). */
export function tensorIo(sym: string, t: Tensor, provenance?: string): TensorIo {
  const io: TensorIo = { sym, shape: [...t.shape], values: tensorValuesOf(t) }
  if (provenance !== undefined) io.provenance = provenance
  return io
}

/** Снимок градиента тензора (t.grad уже вычислен предыдущей операцией). */
export function gradIo(sym: string, t: Tensor): TensorValues {
  if (t.grad === null) throw new Error(`gradIo: у ${sym} нет градиента`)
  if (t.shape.length === 1) return Array.from(t.grad)
  const rows = t.shape[0]!
  const cols = t.shape[1]!
  const out: number[][] = []
  for (let j = 0; j < rows; j++) out.push(Array.from(t.grad.subarray(j * cols, (j + 1) * cols)))
  return out
}

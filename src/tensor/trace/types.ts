/**
 * Типы пошаговой записи walkthrough (перенос из trace.ts телом, D-34):
 * StepRecord — форма записи шага прототипа (schemaVersion 1); SampleTensors —
 * промежуточные тензоры сэмпла по слоям; SampleRecorder — колбэк записи.
 */

import type { Tensor } from '../tensor'
import type { SampleCursor } from './cursor'

export type Phase = 'forward' | 'loss' | 'backward' | 'update'

export type TensorValues = number[] | number[][]

export interface TensorIo {
  sym: string
  shape: number[]
  values: TensorValues
  provenance?: string
}

export interface StepRecord {
  index: number
  phase: Phase
  op: string
  layer: number
  formula: string
  narrative: { ru: string }
  inputs: TensorIo[]
  outputs: TensorIo
  grads: Record<string, TensorValues> | null
  changed: string[]
}

/** Промежуточные тензоры сэмпла по слоям (индекс слоя 0-based). */
export interface SampleTensors {
  /** zPre[k] = W_k·h_{k-1} — до биаса (h_{-1} = x). */
  zPre: (Tensor | null)[]
  /** zPost[k] = zPre[k] + b_k — после биаса. */
  zPost: (Tensor | null)[]
  /** h[k] = act(zPost[k]) — активация; h[K-1] = ŷ. */
  h: (Tensor | null)[]
  L: Tensor | null
}

export type SampleRecorder = (cursor: SampleCursor, opIndex: number) => void

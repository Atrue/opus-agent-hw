/**
 * Типы мок-трейса — зеркало схемы src/data/xor-trace.json (schemaVersion 1,
 * RESEARCH §3.6) + рантайм-валидация validateTrace (threat T-1-02).
 */

export type Phase = 'forward' | 'loss' | 'backward' | 'update' | 'summary'

/** Значения тензора шага: вектор number[] или матрица number[][]. */
export type TensorValues = number[] | number[][]

export interface TensorRef {
  sym: string
  shape: number[]
  values: TensorValues
  provenance?: string
}

export interface StepIO {
  sym: string
  shape: number[]
  values: TensorValues
}

export interface TraceStep {
  index: number
  phase: Phase
  op: string
  layer: number
  formula: string
  narrative: { ru: string }
  inputs: TensorRef[]
  outputs: StepIO
  grads: Record<string, TensorValues> | null
  changed: string[]
}

export interface MockTrace {
  schemaVersion: number
  scenario: string
  seed: number
  generatedBy: string
  network: { layers: number[]; hidden: string; output: string; loss: string; lr: number }
  sample: { x: number[]; y: number }
  weights: { w1: number[][]; b1: number[]; w2: number[][]; b2: number[] }
  steps: TraceStep[]
  final: { lossBefore: number; lossAfter: number; gradNorm: number }
  gradCheck: { method: string; maxRelErr: number }
}

const PHASES: readonly Phase[] = ['forward', 'loss', 'backward', 'update', 'summary']

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isTensorValues(value: unknown): value is TensorValues {
  if (!Array.isArray(value) || value.length === 0) return false
  if (isFiniteNumber(value[0])) {
    return value.every(isFiniteNumber)
  }
  return (
    Array.isArray(value[0]) &&
    value[0].length > 0 &&
    value.every((row) => Array.isArray(row) && row.length === value[0]!.length && row.every(isFiniteNumber))
  )
}

function isTensorLike(value: unknown): value is { sym: unknown; shape: unknown; values: unknown } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.sym === 'string' && Array.isArray(v.shape) && v.shape.every(isFiniteNumber)
}

/**
 * Структурная валидация трейса: schemaVersion, непустая последовательность шагов,
 * корректные фазы и конечность всех чисел. Бросает Error — приложение не должно
 * рендерить числа из невалидного JSON (threat T-1-01/T-1-02).
 */
export function validateTrace(value: unknown): MockTrace {
  if (typeof value !== 'object' || value === null) throw new Error('trace: не объект')
  const t = value as Record<string, unknown>
  if (t.schemaVersion !== 1) throw new Error(`trace: schemaVersion ${String(t.schemaVersion)} !== 1`)
  if (!Array.isArray(t.steps) || t.steps.length === 0) throw new Error('trace: steps пуст или не массив')

  t.steps.forEach((raw, i) => {
    if (typeof raw !== 'object' || raw === null) throw new Error(`trace: steps[${i}] не объект`)
    const s = raw as Record<string, unknown>
    if (!PHASES.includes(s.phase as Phase)) throw new Error(`trace: steps[${i}].phase невалиден: ${String(s.phase)}`)
    if (typeof s.formula !== 'string') throw new Error(`trace: steps[${i}].formula не строка`)
    const narrative = s.narrative
    if (typeof narrative !== 'object' || narrative === null || typeof (narrative as Record<string, unknown>).ru !== 'string') {
      throw new Error(`trace: steps[${i}].narrative.ru не строка`)
    }
    if (!Array.isArray(s.inputs) || !s.inputs.every((input) => isTensorLike(input) && isTensorValues((input as { values: unknown }).values))) {
      throw new Error(`trace: steps[${i}].inputs невалиден`)
    }
    if (!isTensorLike(s.outputs) || !isTensorValues((s.outputs as { values: unknown }).values)) {
      throw new Error(`trace: steps[${i}].outputs невалиден`)
    }
    if (s.grads !== null) {
      if (typeof s.grads !== 'object') throw new Error(`trace: steps[${i}].grads не объект и не null`)
      for (const [key, g] of Object.entries(s.grads as Record<string, unknown>)) {
        if (!isTensorValues(g)) throw new Error(`trace: steps[${i}].grads["${key}"] содержит не-числа`)
      }
    }
    if (!Array.isArray(s.changed) || !s.changed.every((c) => typeof c === 'string')) {
      throw new Error(`trace: steps[${i}].changed невалиден`)
    }
  })

  return value as MockTrace
}

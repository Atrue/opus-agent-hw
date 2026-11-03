/**
 * Пошаговая запись walkthrough (R1, вариант D — recorder-стратегия):
 * StepRecord — форма записи шага прототипа (schemaVersion 1); SampleCursor
 * исполняет 13 операций одного сэмпла НА ЖИВОМ движке по одной за advance().
 *
 * Recorder-флаг: onOp-колбэк = режим record:true (пошаговый UI пишет
 * StepRecord после каждой операции); без колбэка = record:false (пакетный
 * fast-forward). Числа идентичны в обоих режимах — код исполнения один.
 */

import { F } from './functional'
import type { MLP } from './model'
import { SGD } from './optim'
import { Tensor } from './tensor'

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

export interface SampleTensors {
  z1p: Tensor | null
  z1: Tensor | null
  a1: Tensor | null
  z2p: Tensor | null
  z2: Tensor | null
  yhat: Tensor | null
  L: Tensor | null
}

export type SampleRecorder = (cursor: SampleCursor, opIndex: number) => void

/** Операций в одном сэмпле walkthrough: 6 forward + bce + 5 backward + sgd. */
export const OPS_PER_SAMPLE = 13

export class SampleCursor {
  readonly model: MLP
  readonly x: Tensor
  readonly y: Tensor
  readonly lr: number
  readonly tensors: SampleTensors = { z1p: null, z1: null, a1: null, z2p: null, z2: null, yhat: null, L: null }
  /** W2[0,0] до обновления — снимок для записи sgd-шага («до → после»). */
  sgdBefore: number | null = null
  private nextOp = 0
  private readonly onOp: SampleRecorder | undefined
  private readonly opt: SGD

  constructor(model: MLP, x: readonly number[], y: number, lr: number, onOp?: SampleRecorder) {
    this.model = model
    this.x = Tensor.of(x)
    this.y = Tensor.of([y])
    this.lr = lr
    this.onOp = onOp
    this.opt = new SGD(model.params(), lr)
    // чистые градиенты на каждом сэмпле (zero_grad перед backward, micrograd-цикл)
    for (const p of model.params()) p.zeroGrad()
  }

  get opIndex(): number {
    return this.nextOp
  }

  get done(): boolean {
    return this.nextOp >= OPS_PER_SAMPLE
  }

  /** Исполняет СЛЕДУЮЩУЮ операцию живого движка (единый код пошагово/пакетно). */
  advance(): void {
    if (this.done) throw new Error('SampleCursor: сэмпл завершён — создайте новый курсор')
    const op = this.nextOp
    this.nextOp += 1
    const t = this.tensors
    switch (op) {
      case 0:
        t.z1p = this.model.W1.matmul(this.x)
        break
      case 1:
        t.z1 = t.z1p!.add(this.model.b1)
        break
      case 2:
        t.a1 = t.z1!.tanh()
        break
      case 3:
        t.z2p = this.model.W2.matmul(t.a1!)
        break
      case 4:
        t.z2 = t.z2p!.add(this.model.b2)
        break
      case 5:
        t.yhat = t.z2!.sigmoid()
        break
      case 6:
        t.L = F.bce(t.yhat!, this.y)
        break
      case 7: {
        // старт backward: сеем ∂L/∂L = 1 и исполняем обратное замыкание bce
        const L = t.L!
        L.grad = new Float64Array(1)
        L.grad[0] = 1
        L.runBackward()
        break
      }
      case 8:
        t.yhat!.runBackward() // sigmoid: ∂L/∂z2
        break
      case 9:
        t.z2!.runBackward() // add: ∂L/∂z2_pre, ∂L/∂b2
        t.z2p!.runBackward() // matmul: ∂L/∂W2, ∂L/∂a1
        break
      case 10:
        t.a1!.runBackward() // tanh: ∂L/∂z1
        break
      case 11:
        t.z1!.runBackward() // add: ∂L/∂z1_pre, ∂L/∂b1
        t.z1p!.runBackward() // matmul: ∂L/∂W1, ∂L/∂x
        break
      case 12: {
        this.sgdBefore = this.model.W2.data[0]!
        this.opt.step()
        break
      }
      default:
        throw new Error(`SampleCursor: неизвестная операция ${String(op)}`)
    }
    this.onOp?.(this, op)
  }
}

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

/**
 * Пошаговая запись walkthrough (R1, вариант D — recorder-стратегия):
 * StepRecord — форма записи шага прототипа (schemaVersion 1); SampleCursor
 * исполняет walked-опы одного сэмпла НА ЖИВОМ движке по одной за advance().
 * Walked-опы строит buildWalk из спека сети (порядок = топология):
 * forward 3K (matvec/add/activate на слой) → loss → bce-grad →
 * backward парами (activate-grad + affine-grad от выхода ко входу) → sgd.
 *
 * Recorder-флаг: onOp-колбэк = режим record:true (пошаговый UI пишет
 * StepRecord после каждой операции); без колбэка = record:false (пакетный
 * fast-forward). Числа идентичны в обоих режимах — код исполнения один.
 */

import { F } from './functional'
import type { LayerSpec, ScenarioNet } from './model'
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

/** Walked-оп walkthrough: одна «кнопка Шаг» = один примитив живого движка
 *  (или сгруппированная пара backward-замыканий affine-градиентов — как в
 *  прототипе: add-grad и matvec-grad исполняются одной операцией). */
export type WalkOp =
  | { kind: 'matvec'; layer: number }
  | { kind: 'add'; layer: number }
  | { kind: 'activate'; layer: number; activation: 'tanh' | 'sigmoid' }
  | { kind: 'loss' }
  | { kind: 'bce-grad' }
  | { kind: 'activate-grad'; layer: number }
  | { kind: 'affine-grad'; layer: number }
  | { kind: 'sgd' }

/** Walked-опы из спека (порядок = топология; длина = spec.ops.length). */
export function buildWalk(net: readonly LayerSpec[]): readonly WalkOp[] {
  const walk: WalkOp[] = []
  for (let k = 0; k < net.length; k++) {
    walk.push({ kind: 'matvec', layer: k }, { kind: 'add', layer: k }, { kind: 'activate', layer: k, activation: net[k]!.activation })
  }
  walk.push({ kind: 'loss' }, { kind: 'bce-grad' })
  for (let k = net.length - 1; k >= 0; k--) {
    walk.push({ kind: 'activate-grad', layer: k }, { kind: 'affine-grad', layer: k })
  }
  walk.push({ kind: 'sgd' })
  return walk
}

export class SampleCursor {
  readonly model: ScenarioNet
  readonly x: Tensor
  readonly y: Tensor
  readonly lr: number
  /** Маршрут сэмпла: примитивы движка в порядке топологии (из спека). */
  readonly walk: readonly WalkOp[]
  readonly tensors: SampleTensors
  /** Значение показательного веса (последний слой, [0,0]) до обновления —
   *  снимок для записи sgd-шага («до → после»). */
  sgdBefore: number | null = null
  private nextOp = 0
  private readonly onOp: SampleRecorder | undefined
  private readonly opt: SGD

  constructor(model: ScenarioNet, x: readonly number[], y: number, lr: number, onOp?: SampleRecorder) {
    this.model = model
    this.x = Tensor.of(x)
    this.y = Tensor.of([y])
    this.lr = lr
    this.walk = buildWalk(model.layers)
    this.onOp = onOp
    this.opt = new SGD(model.params(), lr)
    this.tensors = {
      zPre: new Array(model.layers.length).fill(null),
      zPost: new Array(model.layers.length).fill(null),
      h: new Array(model.layers.length).fill(null),
      L: null,
    }
    // чистые градиенты на каждом сэмпле (zero_grad перед backward, micrograd-цикл)
    for (const p of model.params()) p.zeroGrad()
  }

  get opIndex(): number {
    return this.nextOp
  }

  get done(): boolean {
    return this.nextOp >= this.walk.length
  }

  /** Исполняет СЛЕДУЮЩУЮ операцию живого движка (единый код пошагово/пакетно). */
  advance(): void {
    if (this.done) throw new Error('SampleCursor: сэмпл завершён — создайте новый курсор')
    const op = this.nextOp
    this.nextOp += 1
    this.execWalk(this.walk[op]!)
    this.onOp?.(this, op)
  }

  private execWalk(w: WalkOp): void {
    const t = this.tensors
    const K = this.model.layers.length
    switch (w.kind) {
      case 'matvec': {
        const src = w.layer === 0 ? this.x : t.h[w.layer - 1]!
        t.zPre[w.layer] = this.model.weights[w.layer]!.matmul(src)
        break
      }
      case 'add':
        t.zPost[w.layer] = t.zPre[w.layer]!.add(this.model.biases[w.layer]!)
        break
      case 'activate':
        t.h[w.layer] = w.activation === 'tanh' ? t.zPost[w.layer]!.tanh() : t.zPost[w.layer]!.sigmoid()
        break
      case 'loss':
        t.L = F.bce(t.h[K - 1]!, this.y)
        break
      case 'bce-grad': {
        // старт backward: сеем ∂L/∂L = 1 и исполняем обратное замыкание bce
        const L = t.L!
        L.grad = new Float64Array(1)
        L.grad[0] = 1
        L.runBackward()
        break
      }
      case 'activate-grad':
        t.h[w.layer]!.runBackward()
        break
      case 'affine-grad':
        // add: градиенты биаса и pre-bias-суммы; затем matvec: веса и вход слоя
        t.zPost[w.layer]!.runBackward()
        t.zPre[w.layer]!.runBackward()
        break
      case 'sgd': {
        this.sgdBefore = this.model.weights[K - 1]!.data[0]!
        this.opt.step()
        break
      }
    }
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

/**
 * SampleCursor — пошаговое исполнение walkthrough (R1, вариант D —
 * recorder-стратегия; перенос из trace.ts телом, D-34): исполняет walked-опы
 * одного сэмпла НА ЖИВОМ движке по одной за advance().
 *
 * Recorder-флаг: onOp-колбэк = режим record:true (пошаговый UI пишет
 * StepRecord после каждой операции); без колбэка = record:false (пакетный
 * fast-forward). Числа идентичны в обоих режимах — код исполнения один.
 */

import { F } from '../functional'
import type { ScenarioNet } from '../model'
import { SGD } from '../optim'
import { Tensor } from '../tensor'
import type { SampleRecorder, SampleTensors } from './types'
import { buildWalk, type WalkOp } from './walk'

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

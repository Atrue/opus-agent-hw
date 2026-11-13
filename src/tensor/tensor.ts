/**
 * Тензорная библиотека (R1, ревью фазы 01): класс Tensor — Float64Array +
 * shape (ранг ≤ 2), micrograd-механика графа (parents + op-дескрипторы
 * обратного шага, topo-backward, аккумуляция grad на месте), словарь имён
 * PyTorch (matmul/add/tanh/sigmoid/backward/zeroGrad). Анти-скоуп v1
 * (R1 §8.3): Module/Sequential, broadcasting, батчи — не реализуются.
 *
 * Мутационная семантика как в Python (R1 §2.2): forward создаёт новые
 * тензоры; grad аккумулируется на месте (+=); оптимизатор мутирует data.
 * Тензоры без requiresGrad тоже получают grad (как в micrograd) — walkthrough
 * показывает ∂L/∂x; requiresGrad маркирует параметры, которые обновляет SGD.
 *
 * Декомпозиция D-29: обратный шаг — ДАННЫЕ (тегированный union BackwardPlan),
 * а не замыкание; исполняет чистая функция-диспетчер runBackwardPlan
 * (backward.ts) с теми же ядрами ops/ и тем же порядком accumulate
 * (бит-идентичность, Pitfall 2).
 */

import { runBackwardPlan } from './backward'
import {
  addForward,
  matvecForward,
  sigmoidForward,
  tanhForward,
} from './ops'

export type OpName = 'matmul' | 'add' | 'tanh' | 'sigmoid' | 'bce'

/** Дескриптор обратного шага op (D-29): данные вместо замыкания — tagged
 *  union по образцу ExpandRequest (expanders.ts); ровно тот набор ops, что
 *  строит forward (+ F.bce). Исполняет чистый диспетчер runBackwardPlan
 *  (backward.ts). */
export type BackwardPlan =
  | { op: 'matmul'; w: Tensor; x: Tensor; rows: number; cols: number }
  | { op: 'add'; a: Tensor; b: Tensor }
  | { op: 'tanh'; z: Tensor }
  | { op: 'sigmoid'; z: Tensor }
  | { op: 'bce'; p: Tensor; t: Tensor }

export interface TensorInit {
  requiresGrad?: boolean
  op?: OpName | ''
  parents?: readonly Tensor[]
  plan?: BackwardPlan
}

export class Tensor {
  readonly data: Float64Array
  readonly shape: readonly number[]
  grad: Float64Array | null = null
  readonly requiresGrad: boolean
  readonly op: OpName | ''
  readonly parents: readonly Tensor[]
  private readonly plan: BackwardPlan | null

  constructor(data: Float64Array, shape: readonly number[], init: TensorInit = {}) {
    if (shape.length < 1 || shape.length > 2) throw new Error(`Tensor: ранг ${String(shape.length)} не поддерживается (≤ 2)`)
    if (data.length !== shape.reduce((a, b) => a * b, 1)) throw new Error('Tensor: data не совпадает с shape')
    this.data = data
    this.shape = shape
    this.requiresGrad = init.requiresGrad ?? false
    this.op = init.op ?? ''
    this.parents = init.parents ?? []
    this.plan = init.plan ?? null
  }

  /** Литерал из number[] (вектор [n]) или number[][] (матрица [rows, cols]). */
  static of(values: readonly number[] | readonly number[][], requiresGrad = false): Tensor {
    const first = values[0]
    if (Array.isArray(first)) {
      const rows = values.length
      const cols = first.length
      const data = new Float64Array(rows * cols)
        ; (values as readonly number[][]).forEach((row, j) => {
          if (row.length !== cols) throw new Error('Tensor.of: рваная матрица')
          row.forEach((v, i) => {
            data[j * cols + i] = v
          })
        })
      return new Tensor(data, [rows, cols], { requiresGrad })
    }
    return new Tensor(Float64Array.from(values as readonly number[]), [values.length], { requiresGrad })
  }

  /** z = W·x ↔ W.matmul(x): this — матрица [rows, cols], x — вектор [cols]. */
  matmul(o: Tensor): Tensor {
    if (this.shape.length !== 2 || o.shape.length !== 1 || this.shape[1] !== o.shape[0]) {
      throw new Error(`matmul: несовместимые формы [${this.shape.join(',')}] · [${o.shape.join(',')}]`)
    }
    const rows = this.shape[0]!
    const cols = this.shape[1]!
    return new Tensor(matvecForward(this.data, rows, cols, o.data), [rows], {
      op: 'matmul',
      parents: [this, o],
      requiresGrad: this.requiresGrad || o.requiresGrad,
      plan: { op: 'matmul', w: this, x: o, rows, cols },
    })
  }

  add(o: Tensor): Tensor {
    if (this.shape.length !== 1 || o.shape.length !== 1 || this.shape[0] !== o.shape[0]) {
      throw new Error(`add: несовместимые формы [${this.shape.join(',')}] + [${o.shape.join(',')}]`)
    }
    return new Tensor(addForward(this.data, o.data), [...this.shape], {
      op: 'add',
      parents: [this, o],
      requiresGrad: this.requiresGrad || o.requiresGrad,
      plan: { op: 'add', a: this, b: o },
    })
  }

  tanh(): Tensor {
    if (this.shape.length !== 1) throw new Error(`tanh: ожидается вектор, получен [${this.shape.join(',')}]`)
    return new Tensor(tanhForward(this.data), [...this.shape], {
      op: 'tanh',
      parents: [this],
      requiresGrad: this.requiresGrad,
      plan: { op: 'tanh', z: this },
    })
  }

  sigmoid(): Tensor {
    if (this.shape.length !== 1) throw new Error(`sigmoid: ожидается вектор, получен [${this.shape.join(',')}]`)
    return new Tensor(sigmoidForward(this.data), [...this.shape], {
      op: 'sigmoid',
      parents: [this],
      requiresGrad: this.requiresGrad,
      plan: { op: 'sigmoid', z: this },
    })
  }

  /** Полный backward от скалярного корня [1]: topo-сортировка + обратный проход
   *  в порядке, идентичном пошаговым runBackward курсора (инвариант R1/R3). */
  backward(): void {
    if (this.shape.length !== 1 || this.shape[0] !== 1) throw new Error('backward: корень должен быть скаляром [1]')
    const topo: Tensor[] = []
    const seen = new Set<Tensor>()
    const visit = (t: Tensor): void => {
      if (seen.has(t)) return
      seen.add(t)
      for (const p of t.parents) visit(p)
      topo.push(t)
    }
    visit(this)
    if (this.grad === null) this.grad = new Float64Array(1)
    // micrograd: сеем ∂L/∂L = 1
    this.grad[0] = 1
    for (let k = topo.length - 1; k >= 0; k--) topo[k]!.runBackward()
  }

  /** Исполняет обратный шаг только этой op (пошаговый backward):
   *  диспетчер чистых ядер ops/ по op-дескриптору (D-29, backward.ts). */
  runBackward(): void {
    if (this.plan !== null) runBackwardPlan(this.plan, this)
  }

  zeroGrad(): void {
    this.grad = null
  }
}

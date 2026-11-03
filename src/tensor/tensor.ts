/**
 * Тензорная библиотека (R1, ревью фазы 01): класс Tensor — Float64Array +
 * shape (ранг ≤ 2), micrograd-механика графа (parents + обратные замыкания,
 * topo-backward, аккумуляция grad на месте), словарь имён PyTorch
 * (matmul/add/tanh/sigmoid/backward/zeroGrad). Анти-скоуп v1 (R1 §8.3):
 * Module/Sequential, broadcasting, батчи — не реализуются.
 *
 * Мутационная семантика как в Python (R1 §2.2): forward создаёт новые
 * тензоры; grad аккумулируется на месте (+=); оптимизатор мутирует data.
 * Тензоры без requiresGrad тоже получают grad (как в micrograd) — walkthrough
 * показывает ∂L/∂x; requiresGrad маркирует параметры, которые обновляет SGD.
 */

import {
  addForward,
  matvecForward,
  matvecGradW,
  matvecGradX,
  sigmoidBackwardFromOutput,
  sigmoidForward,
  tanhBackwardFromOutput,
  tanhForward,
} from './ops'

export type OpName = 'matmul' | 'add' | 'tanh' | 'sigmoid' | 'bce'

export interface TensorInit {
  requiresGrad?: boolean
  op?: OpName | ''
  parents?: readonly Tensor[]
}

/** Аккумуляция градиента на месте: t.grad += delta (ленивая аллокация).
 *  Экспорт для внутренних модулей библиотеки (не реэкспортируется из index.ts). */
export function accumulate(t: Tensor, delta: Float64Array): void {
  if (t.grad === null) {
    t.grad = Float64Array.from(delta)
    return
  }
  for (let i = 0; i < delta.length; i++) t.grad[i] = t.grad[i]! + delta[i]!
}

export class Tensor {
  readonly data: Float64Array
  readonly shape: readonly number[]
  grad: Float64Array | null = null
  readonly requiresGrad: boolean
  readonly op: OpName | ''
  readonly parents: readonly Tensor[]
  private backwardFn: () => void

  constructor(data: Float64Array, shape: readonly number[], init: TensorInit = {}) {
    if (shape.length < 1 || shape.length > 2) throw new Error(`Tensor: ранг ${String(shape.length)} не поддерживается (≤ 2)`)
    if (data.length !== shape.reduce((a, b) => a * b, 1)) throw new Error('Tensor: data не совпадает с shape')
    this.data = data
    this.shape = shape
    this.requiresGrad = init.requiresGrad ?? false
    this.op = init.op ?? ''
    this.parents = init.parents ?? []
    this.backwardFn = () => {}
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

  /** Установка обратного замыкания (после создания out — micrograd-паттерн). */
  private setBackward(fn: () => void): void {
    this.backwardFn = fn
  }

  /** Установка обратного замыкания для op, созданных вне класса (F.bce). */
  static defineBackward(t: Tensor, fn: () => void): void {
    t.backwardFn = fn
  }

  /** z = W·x ↔ W.matmul(x): this — матрица [rows, cols], x — вектор [cols]. */
  matmul(o: Tensor): Tensor {
    if (this.shape.length !== 2 || o.shape.length !== 1 || this.shape[1] !== o.shape[0]) {
      throw new Error(`matmul: несовместимые формы [${this.shape.join(',')}] · [${o.shape.join(',')}]`)
    }
    const rows = this.shape[0]!
    const cols = this.shape[1]!
    const out = new Tensor(matvecForward(this.data, rows, cols, o.data), [rows], {
      op: 'matmul',
      parents: [this, o],
      requiresGrad: this.requiresGrad || o.requiresGrad,
    })
    out.setBackward(() => {
      if (out.grad === null) return
      accumulate(this, matvecGradW(out.grad, o.data, rows, cols))
      accumulate(o, matvecGradX(this.data, rows, cols, out.grad))
    })
    return out
  }

  add(o: Tensor): Tensor {
    if (this.shape.length !== 1 || o.shape.length !== 1 || this.shape[0] !== o.shape[0]) {
      throw new Error(`add: несовместимые формы [${this.shape.join(',')}] + [${o.shape.join(',')}]`)
    }
    const out = new Tensor(addForward(this.data, o.data), [...this.shape], {
      op: 'add',
      parents: [this, o],
      requiresGrad: this.requiresGrad || o.requiresGrad,
    })
    out.setBackward(() => {
      if (out.grad === null) return
      accumulate(this, out.grad)
      accumulate(o, out.grad)
    })
    return out
  }

  tanh(): Tensor {
    if (this.shape.length !== 1) throw new Error(`tanh: ожидается вектор, получен [${this.shape.join(',')}]`)
    const out = new Tensor(tanhForward(this.data), [...this.shape], {
      op: 'tanh',
      parents: [this],
      requiresGrad: this.requiresGrad,
    })
    out.setBackward(() => {
      if (out.grad === null) return
      accumulate(this, tanhBackwardFromOutput(out.data, out.grad))
    })
    return out
  }

  sigmoid(): Tensor {
    if (this.shape.length !== 1) throw new Error(`sigmoid: ожидается вектор, получен [${this.shape.join(',')}]`)
    const out = new Tensor(sigmoidForward(this.data), [...this.shape], {
      op: 'sigmoid',
      parents: [this],
      requiresGrad: this.requiresGrad,
    })
    out.setBackward(() => {
      if (out.grad === null) return
      accumulate(this, sigmoidBackwardFromOutput(out.data, out.grad))
    })
    return out
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
    this.grad[0] = 1 // micrograd: сеем ∂L/∂L = 1
    for (let k = topo.length - 1; k >= 0; k--) topo[k]!.runBackward()
  }

  /** Исполняет обратное замыкание только этой op (пошаговый backward). */
  runBackward(): void {
    this.backwardFn()
  }

  zeroGrad(): void {
    this.grad = null
  }
}

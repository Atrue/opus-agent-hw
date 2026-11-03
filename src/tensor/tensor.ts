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

export type OpName = 'matmul' | 'add' | 'tanh' | 'sigmoid' | 'bce'

export interface TensorInit {
  requiresGrad?: boolean
  op?: OpName | ''
  parents?: readonly Tensor[]
  backward?: () => void
}

export class Tensor {
  readonly data: Float64Array
  readonly shape: readonly number[]
  grad: Float64Array | null = null
  readonly requiresGrad: boolean
  readonly op: OpName | ''
  readonly parents: readonly Tensor[]
  private readonly backwardFn: () => void

  constructor(data: Float64Array, shape: readonly number[], init: TensorInit = {}) {
    if (shape.length < 1 || shape.length > 2) throw new Error(`Tensor: ранг ${String(shape.length)} не поддерживается (≤ 2)`)
    if (data.length !== shape.reduce((a, b) => a * b, 1)) throw new Error('Tensor: data не совпадает с shape')
    this.data = data
    this.shape = shape
    this.requiresGrad = init.requiresGrad ?? false
    this.op = init.op ?? ''
    this.parents = init.parents ?? []
    this.backwardFn = init.backward ?? (() => {})
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
  matmul(_o: Tensor): Tensor {
    throw new Error('Tensor.matmul: не реализовано (RED)')
  }

  add(_o: Tensor): Tensor {
    throw new Error('Tensor.add: не реализовано (RED)')
  }

  tanh(): Tensor {
    throw new Error('Tensor.tanh: не реализовано (RED)')
  }

  sigmoid(): Tensor {
    throw new Error('Tensor.sigmoid: не реализовано (RED)')
  }

  /** Полный backward от скалярного корня: topo-сортировка + обратный проход. */
  backward(): void {
    throw new Error('Tensor.backward: не реализовано (RED)')
  }

  /** Исполняет обратное замыкание только этой op (пошаговый backward). */
  runBackward(): void {
    this.backwardFn()
  }

  zeroGrad(): void {
    this.grad = null
  }
}

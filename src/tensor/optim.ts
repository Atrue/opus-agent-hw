/**
 * SGD (словарь PyTorch, R1 §8.2): step() мутирует data параметров на месте
 * (W.data -= lr * W.grad), zeroGrad() сбрасывает градиенты.
 */

import type { Tensor } from './tensor'

export class SGD {
  private readonly params: readonly Tensor[]
  private readonly lr: number

  constructor(params: readonly Tensor[], lr: number) {
    this.params = params
    this.lr = lr
  }

  step(): void {
    for (const p of this.params) {
      const g = p.grad
      if (g === null) continue
      for (let i = 0; i < p.data.length; i++) p.data[i] = p.data[i]! - this.lr * g[i]!
    }
  }

  zeroGrad(): void {
    for (const p of this.params) p.zeroGrad()
  }
}

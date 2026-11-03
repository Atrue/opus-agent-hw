/**
 * MLP 2-3-1 (R1): параметры-тензоры с requiresGrad, forward() возвращает все
 * промежуточные тензоры (z1, a1, z2, yhat) — база пошаговой записи walkthrough.
 * Ориентация matmul без транспонирований: z = W·x ↔ W.matmul(x).
 */

import { Tensor } from './tensor'

export interface MlpStartWeights {
  w1: number[][]
  b1: number[]
  w2: number[][]
  b2: number[]
}

export interface MlpForward {
  z1p: Tensor
  z1: Tensor
  a1: Tensor
  z2p: Tensor
  z2: Tensor
  yhat: Tensor
}

export class MLP {
  readonly W1: Tensor
  readonly b1: Tensor
  readonly W2: Tensor
  readonly b2: Tensor

  constructor(start: MlpStartWeights) {
    this.W1 = Tensor.of(start.w1, true)
    this.b1 = Tensor.of(start.b1, true)
    this.W2 = Tensor.of(start.w2, true)
    this.b2 = Tensor.of(start.b2, true)
  }

  params(): readonly Tensor[] {
    return [this.W1, this.b1, this.W2, this.b2]
  }

  forward(_x: Tensor): MlpForward {
    throw new Error('MLP.forward: не реализовано (RED)')
  }
}

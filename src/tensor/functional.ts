/**
 * F-пространство функций потерь (словарь torch.nn.functional, R1 §8.2):
 * F.bce(pred, target) — binary cross-entropy, скалярный тензор [1].
 *
 * Обратный шаг — через op-дескриптор BackwardPlan (D-29): план {p, t}
 * передаётся в конструктор Tensor и исполняется диспетчером
 * runBackwardPlan (tensor.ts), как и у всех остальных ops.
 */

import { bceForward } from './ops'
import { Tensor } from './tensor'

export const F = {
  /** L = −[y·ln ŷ + (1−y)·ln(1−ŷ)]; backward: ∂L/∂ŷ = (ŷ−y)/(ŷ(1−ŷ)). */
  bce(pred: Tensor, target: Tensor): Tensor {
    if (pred.shape.length !== 1 || pred.shape[0] !== 1 || target.shape.length !== 1 || target.shape[0] !== 1) {
      throw new Error('F.bce: ожидаются скаляры [1]')
    }
    return new Tensor(bceForward(pred.data, target.data), [1], {
      op: 'bce',
      parents: [pred, target],
      requiresGrad: pred.requiresGrad || target.requiresGrad,
      plan: { op: 'bce', p: pred, t: target },
    })
  },
}

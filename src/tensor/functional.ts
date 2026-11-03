/**
 * F-пространство функций потерь (словарь torch.nn.functional, R1 §8.2):
 * F.bce(pred, target) — binary cross-entropy, скалярный тензор [1].
 */

import { bceForward, bceGradP } from './ops'
import { Tensor } from './tensor'

export const F = {
  /** L = −[y·ln ŷ + (1−y)·ln(1−ŷ)]; backward: ∂L/∂ŷ = (ŷ−y)/(ŷ(1−ŷ)). */
  bce(_pred: Tensor, _target: Tensor): Tensor {
    void bceForward
    void bceGradP
    throw new Error('F.bce: не реализовано (RED)')
  },
}

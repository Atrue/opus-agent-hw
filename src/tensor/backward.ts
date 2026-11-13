/**
 * Диспетчер обратного шага Tensor (D-29; перенос из tensor.ts телом, D-34):
 * чистая функция runBackwardPlan — switch по op-дескриптору BackwardPlan
 * (данные вместо замыкания). Внутренний для src/tensor — не реэкспортируется
 * из index.ts.
 */

import { bceGradP, matvecGradW, matvecGradX, sigmoidBackwardFromOutput, tanhBackwardFromOutput } from './ops'
import type { BackwardPlan, Tensor } from './tensor'

/** Аккумуляция градиента на месте: t.grad += delta (ленивая аллокация).
 *  Внутренняя функция модуля (внешних потребителей нет — аудит ревью 02-11). */
function accumulate(t: Tensor, delta: Float64Array): void {
  if (t.grad === null) {
    t.grad = Float64Array.from(delta)
    return
  }
  for (let i = 0; i < delta.length; i++) t.grad[i] = t.grad[i]! + delta[i]!
}

/** Чистый диспетчер обратного шага (D-29): switch по plan.op; каждый кейс —
 *  те же вызовы ядер ops/ и тот же порядок accumulate(родитель A →
 *  родитель B), что исходные замыкания (матмул: сначала w, потом x) —
 *  перестановка меняет биты (Pitfall 2, NFR-02). */
export function runBackwardPlan(plan: BackwardPlan, out: Tensor): void {
  if (out.grad === null) return
  switch (plan.op) {
    case 'matmul':
      accumulate(plan.w, matvecGradW(out.grad, plan.x.data, plan.rows, plan.cols))
      accumulate(plan.x, matvecGradX(plan.w.data, plan.rows, plan.cols, out.grad))
      return
    case 'add':
      accumulate(plan.a, out.grad)
      accumulate(plan.b, out.grad)
      return
    case 'tanh':
      accumulate(plan.z, tanhBackwardFromOutput(out.data, out.grad))
      return
    case 'sigmoid':
      accumulate(plan.z, sigmoidBackwardFromOutput(out.data, out.grad))
      return
    case 'bce':
      accumulate(plan.p, bceGradP(plan.p.data, plan.t.data))
  }
}

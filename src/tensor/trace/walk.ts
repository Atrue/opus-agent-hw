/**
 * Маршрут walkthrough из спека сети: walked-опы в порядке топологии
 * (перенос из trace.ts телом, D-34): forward 3K (matvec/add/activate на
 * слой) → loss → bce-grad → backward парами (activate-grad + affine-grad
 * от выхода ко входу) → sgd.
 */

import type { LayerSpec } from '../model'

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

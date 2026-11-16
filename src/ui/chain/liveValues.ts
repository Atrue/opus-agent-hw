/**
 * Живые значения по символу звена (вынесен из LinkPanel.tsx, ревью 02-11:
 * only-export-components) — разрешение через layerSymbols спека (D-30):
 * веса/биасы/слои по символу w/b/z/h, входы/метка/η напрямую; градиент —
 * после backward-опы (до — null). Потребляется панелью звена и live-строкой
 * истории звена (LinkHistory, 01.2-02).
 */

import { run } from '../../run/run'
import type { Tensor } from '../../tensor'

function tensorValues(t: Tensor | null): number[] | null {
  return t === null ? null : Array.from(t.data)
}

/** Живые значения по символу звена (см. JSDoc модуля). */
export function liveValues(sym: string): number[] | null {
  const cursor = run.activeCursor
  const t = cursor.tensors
  const spec = run.scenario
  const syms = spec.render.layerSymbols
  if (sym === 'x') return Array.from(cursor.x.data)
  if (sym === 'y') return Array.from(cursor.y.data)
  if (sym === 'η') return [spec.lr]
  if (sym === 'L') return tensorValues(t.L)
  for (let k = 0; k < syms.length; k++) {
    if (sym === syms[k]!.w) return Array.from(run.model.weights[k]!.data)
    if (sym === syms[k]!.b) return Array.from(run.model.biases[k]!.data)
    if (sym === syms[k]!.z) return tensorValues(t.zPost[k])
    if (sym === syms[k]!.h) return tensorValues(t.h[k])
    if (sym === `∂L/∂${syms[k]!.w}`) {
      const g = run.model.weights[k]!.grad
      return g === null ? null : Array.from(g)
    }
  }
  // показательный вес update-станции: [0,0] последнего слоя
  const K = syms.length
  if (sym === `${syms[K - 1]!.w}[0,0]`) return [run.model.weights[K - 1]!.data[0]!]
  return null
}

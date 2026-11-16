/**
 * Живые числа узлов графа (2.1-02, фикс 2): значение/градиент по биндингам
 * спека (D-30) + tier-1 HintData для NumberHint на узлах-звеньях — портал
 * Floating UI рендерит тултип ПОВЕРХ SVG графа. Чистый модуль без React
 * (fast-refresh-safe); биндинги — те же, что питают станции рендера
 * (инвариант «граф = drill-down = движок»).
 */

import { run } from '../../run/run'
import { activeScenario, type NodeBinding, type RenderNode } from '../../run/scenario'
import type { SampleCursor, Tensor } from '../../tensor'
import type { HintData } from '../numbers/hint'

/** Спека-узлы по id графа (биндинги живых чисел и клика — данные рендера). */
const renderNodeById = new Map<string, RenderNode>(activeScenario().render.nodes.map((n) => [n.id, n]))

export function renderNodeOf(id: string): RenderNode | undefined {
  return renderNodeById.get(id)
}

/** Тензор слота сэмпла по биндингу (zPre/zPost/h по слою; L — скаляр лосса). */
function tensorOf(cursor: SampleCursor, b: NodeBinding): Tensor | null | undefined {
  if (b.kind !== 'tensor') return undefined
  return b.slot === 'L' ? cursor.tensors.L : cursor.tensors[b.slot][b.layer]
}

/** Живое значение по биндингу (гейт: число доступно, когда операция шага
 *  исполнена в текущем сэмпле — done[step] !== undefined). */
export function bindingValue(b: NodeBinding): number | undefined {
  const cursor = run.activeCursor
  switch (b.kind) {
    case 'input':
      return cursor.x.data[b.index]
    case 'target':
      return cursor.y.data[0]
    case 'weight':
      return run.model.weights[b.layer]!.data[b.index]
    case 'bias':
      return run.model.biases[b.layer]!.data[b.index]
    case 'tensor': {
      if (b.step !== undefined && run.sampleOpValues[b.step] === undefined) return undefined
      const t = tensorOf(cursor, b)
      return t === null || t === undefined ? undefined : t.data[b.index]
    }
    case 'dot': {
      if (run.sampleOpValues[b.step] === undefined) return undefined
      const src: Tensor | null = b.layer === 0 ? cursor.x : cursor.tensors.h[b.layer - 1] ?? null
      if (src === null) return undefined
      const w = run.model.weights[b.layer]!
      const cols = src.data.length
      let acc = 0
      for (let i = 0; i < cols; i++) acc += w.data[b.row * cols + i]! * src.data[i]!
      return acc
    }
  }
}

/** Градиент ∂L/∂· по биндингу — после соответствующей backward-опы; иначе undefined. */
export function bindingGrad(b: NodeBinding): number | undefined {
  const cursor = run.activeCursor
  const g = (t: Tensor | null | undefined, i: number): number | undefined =>
    t === null || t === undefined || t.grad === null ? undefined : t.grad[i]
  switch (b.kind) {
    case 'input':
      return g(cursor.x, b.index)
    case 'target':
      return undefined
    case 'weight':
      return g(run.model.weights[b.layer]!, b.index)
    case 'bias':
      return g(run.model.biases[b.layer]!, b.index)
    case 'tensor':
      return g(tensorOf(cursor, b), b.index)
    case 'dot':
      return g(b.layer === 0 ? cursor.tensors.zPost[0] : cursor.tensors.zPost[b.layer], b.row)
  }
}

/** Живое значение звена (число доступно, когда операция исполнена). */
export function nodeValue(id: string): number | undefined {
  const rn = renderNodeById.get(id)
  return rn?.value === undefined ? undefined : bindingValue(rn.value)
}

/** Градиент звена (∂L/∂·) — после соответствующей backward-опы; иначе undefined. */
export function nodeGrad(id: string): number | undefined {
  const rn = renderNodeById.get(id)
  return rn?.grad === undefined ? undefined : bindingGrad(rn.grad)
}

/**
 * Tier-1 подсказка узла-звена (NumberHint): метка + живое значение +
 * градиент при наличии. null — данных нет (н/д) или узел не звено-число
 * (операции выбирают звено цепи, тултип им не нужен).
 */
export function nodeHint(id: string): HintData | null {
  const rn = renderNodeById.get(id)
  if (rn === undefined || rn.kind !== 'value') return null
  const value = nodeValue(id)
  if (value === undefined) return null
  const gradient = nodeGrad(id)
  return { sym: rn.label, value, formula: null, gradient: gradient === undefined ? null : gradient, note: null }
}

/**
 * Серии истории звена из spec.render.series (перенос из history.ts телом,
 * D-34): узловые пики записей + плоские срезы весов + размерность сэмпла
 * активного сценария. Сценарий сессии фиксируется до импорта UI — SERIES
 * вычисляется на инициализации модуля (как прежде в history.ts).
 */

import { activeScenario, type ScenarioModel } from '../scenario'
import type { SegmentId, SampleRecord } from '../types'
import type { NodePick } from './types'

/** Сэмплов в эпохе — данные активного сценария (история сессии одного URL). */
export const sampleCount = (): number => activeScenario().samples.length

/** Серии истории из spec.render.series (тесты параметризуют XOR/neuron). */
export function seriesOf(spec: ScenarioModel = activeScenario()) {
  const node: Record<string, { labels: readonly string[]; pick: NodePick }> = Object.fromEntries(
    Object.entries(spec.render.series.node).map(([sym, n]) => [
      sym,
      {
        labels: n.labels,
        pick: (r: SampleRecord): readonly number[] => {
          if (n.pick.kind === 'scalar') return [r[n.pick.field] as number]
          if (n.pick.kind === 'record') return r[n.pick.field] as readonly number[]
          return r.nodes[n.pick.node] ?? []
        },
      },
    ]),
  )
  return {
    node,
    weight: Object.fromEntries(
      Object.entries(spec.render.series.weight).map(([sym, w]) => [sym, { labels: w.labels, from: w.from, to: w.to }]),
    ) as Record<string, { labels: readonly string[]; from: number; to: number }>,
    defaultSymbol: { ...spec.render.series.defaultSymbol } as Record<SegmentId, string>,
    weightRows: Object.values(spec.render.series.weight).flatMap((w) => w.labels),
  }
}

/** Серии активного сценария (сценарий сессии фиксируется до импорта UI). */
export const SERIES = seriesOf()

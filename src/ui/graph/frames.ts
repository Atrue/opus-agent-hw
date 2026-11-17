/**
 * Геометрия рамок-нейронов (2.1-03, фикс 4): bbox узлов-членов + отступ —
 * чистая функция структуры спека (детерминизм e2e: одинаковый вход даёт
 * бит-идентичную картину, без измерений DOM). Без React (fast-refresh-safe).
 */

import { activeScenario, type ScenarioModel } from '../../run/scenario'
import { buildGraph, NODE_H, NODE_W } from './geometry'

/** Отступ рамки от содержимого (квадратные блоки 48 + круги оп). */
export const FRAME_PAD = 12
/** Место под заголовок рамки над коробкой. */
export const FRAME_TITLE_H = 16

export interface FrameBox {
  readonly id: string
  readonly title: string
  /** Левый-верхний угол коробки. */
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** Центр коробки (позиция коллапс-блока). */
  readonly cx: number
  readonly cy: number
}

/** Рамки спека в координатах канвы (bbox членов ± FRAME_PAD). */
export function frameGeometry(spec: ScenarioModel = activeScenario()): readonly FrameBox[] {
  const nodes = buildGraph(spec).nodes
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return spec.render.frames.map((f) => {
    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const id of f.nodes) {
      const n = byId.get(id)
      if (n === undefined) continue
      const half = n.kind === 'op' ? 21 : NODE_W / 2
      const halfY = n.kind === 'op' ? 21 : NODE_H / 2
      minX = Math.min(minX, n.x - half)
      maxX = Math.max(maxX, n.x + half)
      minY = Math.min(minY, n.y - halfY)
      maxY = Math.max(maxY, n.y + halfY)
    }
    const x = minX - FRAME_PAD
    const y = minY - FRAME_PAD
    const w = maxX - minX + FRAME_PAD * 2
    const h = maxY - minY + FRAME_PAD * 2
    return { id: f.id, title: f.title, x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
  })
}

/** id рамки узла-члена (для переприкрепления рёбер при коллапсе). */
export function frameOfNode(spec: ScenarioModel = activeScenario()): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (const f of spec.render.frames) for (const id of f.nodes) map.set(id, f.id)
  return map
}

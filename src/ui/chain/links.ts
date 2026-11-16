/**
 * Звенья цепи «формулы-хребта» (перенос из chainLinks.ts телом, D-34):
 * цепь звеньев (XOR: x → z1 → a1 → z2 → ŷ → L → W) — чистый view-слой над
 * прогоном (без React, fast-refresh-safe; движок не меняется). Заголовки —
 * символ формулы первым (Gap 6). Пользовательские строки (RU) изолированы в
 * данных спека (D-10, RU-first). Идентификаторы звеньев — строки спека
 * (набор звеньев — данные сценария; нейрон-сценарий сжимает цепь до 5 звеньев).
 */

import { activeScenario, type ScenarioModel } from '../../run/scenario'
import type { SegmentId } from '../../run/types'

export interface ChainSegment {
  id: SegmentId
  /** Заголовок звена (RU, символ формулы первым) — шапка панели звена. */
  title: string
  /** Формула звена — данные спека (XOR: склейка формул opMeta matvec+add). */
  formula: string
  /** Символы формулы-строки, выбирающие это звено. */
  symbols: readonly string[]
}

/** Звенья/символы/подмножества из спека (тесты параметризуют XOR/neuron). */
export function chainOf(spec: ScenarioModel = activeScenario()) {
  const segments: readonly ChainSegment[] = spec.render.segments.map((seg) => ({
    id: seg.id,
    title: seg.title,
    formula: seg.formula,
    symbols: seg.symbols,
  }))
  return {
    segments,
    symbolToSegment: Object.fromEntries(segments.flatMap((s) => s.symbols.map((sym) => [sym, s.id]))) as Readonly<
      Record<string, SegmentId>
    >,
    numberSyms: Object.fromEntries(spec.render.segments.map((seg) => [seg.id, seg.numberSyms])) as Readonly<
      Record<SegmentId, readonly string[]>
    >,
    symbolNodes: Object.assign({}, ...spec.render.segments.map((seg) => seg.symbolNodes)) as Readonly<
      Record<string, readonly string[]>
    >,
  }
}

/** Звенья цепи активного сценария (порядок = цепь). */
export const SEGMENTS: readonly ChainSegment[] = chainOf().segments

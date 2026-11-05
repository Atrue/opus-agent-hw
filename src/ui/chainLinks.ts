/**
 * Модель звеньев «формулы-хребта» (01.2-01): data-слой без React
 * (fast-refresh-safe). Цепь из 7 звеньев x → z1 → a1 → z2 → ŷ → L → W;
 * формулы — из opMeta сценария; symbolToSegment отображает символ формулы
 * ровно в одно звено; geometryOf — геометрия подсветки звена на диаграмме.
 * RU-строки (заголовки звеньев) изолированы здесь.
 */

export type SegmentId = 'x' | 'z1' | 'a1' | 'z2' | 'yhat' | 'L' | 'W'

export interface ChainSegment {
  id: SegmentId
  /** Заголовок звена (RU) — шапка панели звена. */
  title: string
  /** Формула звена — из opMeta сценария (z1/z2: склейка matvec+add). */
  formula: string
  /** Символы формулы-строки, выбирающие это звено. */
  symbols: readonly string[]
}

/** Плашки активаций на диаграмме (словарь формул). */
export type PlateId = 'tanh' | 'σ'

/** Геометрия звена на диаграмме: множества id узлов/рёбер/плашек/биасов. */
export interface SegmentGeometry {
  nodes: Set<string>
  edges: Set<string>
  plates: Set<PlateId>
  biases: Set<string>
}

export const SEGMENTS: readonly ChainSegment[] = []

export const symbolToSegment: Readonly<Record<string, SegmentId>> = {}

export function geometryOf(_segment: SegmentId, _symbol?: string): SegmentGeometry {
  return { nodes: new Set(), edges: new Set(), plates: new Set(), biases: new Set() }
}

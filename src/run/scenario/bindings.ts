/**
 * Фабрики живых чисел узлов и рёбер спека (перенос из scenario.ts телом):
 * короткие конструкторы биндингов NodeBinding и рёбер RenderEdge — общие
 * для XOR и neuron; внутренние для scenario/ (не реэкспортируются).
 */

import type { NodeBinding, RenderEdge } from './types'

// ---- фабрики живых чисел узлов (короткие конструкторы биндингов) ----
export const inB = (index: number): NodeBinding => ({ kind: 'input', index })
export const wB = (layer: number, index: number): NodeBinding => ({ kind: 'weight', layer, index })
export const bB = (layer: number, index: number): NodeBinding => ({ kind: 'bias', layer, index })
export const ten = (slot: 'zPre' | 'zPost' | 'h' | 'L', layer: number, index: number, step?: number): NodeBinding =>
  step === undefined ? { kind: 'tensor', slot, layer, index } : { kind: 'tensor', slot, layer, index, step }
export const dot = (layer: number, row: number, step: number): NodeBinding => ({ kind: 'dot', layer, row, step })

/** Ребро потока: операнд → операция / операция → операция (без пересадок, 2.1-01). */
export const flow = (from: string, to: string): RenderEdge => ({ from, to })

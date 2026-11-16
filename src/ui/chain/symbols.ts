/**
 * Символы формулы-строки → звено (перенос из chainLinks.ts телом, D-34):
 * каждый символ формулы сети — ровно в одно звено; живые числа панели звена.
 */

import type { SegmentId } from '../../run/types'
import { chainOf } from './links'

/** Каждый символ формулы сети — ровно в одно звено (источник: SEGMENTS). */
export const symbolToSegment: Readonly<Record<string, SegmentId>> = chainOf().symbolToSegment

/** Символы живых чисел панели звена (значения — живые тензоры прогона). */
export const SEGMENT_NUMBER_SYMS: Readonly<Record<SegmentId, readonly string[]>> = chainOf().numberSyms

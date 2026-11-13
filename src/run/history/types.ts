/**
 * Типы домена history/ (перенос из history.ts телом, D-34): общий тип
 * извлечения узлового поля записи — используется сериями (series.ts) и
 * историей звена (linkHistory.ts).
 */

import type { SampleRecord } from '../types'

/** Извлечение узлового поля записи (по символу формулы). */
export type NodePick = (r: SampleRecord) => readonly number[]

/**
 * Баррел домена trace/ — пошаговое исполнение walkthrough: маршрут (walk),
 * курсор (cursor), типы записи (types), снапшот-хелперы (io). Импорт-
 * спецификатор './trace' у потребителей не меняется (D-34).
 */
export { SampleCursor } from './cursor'
export { gradIo, tensorIo, tensorValuesOf } from './io'
export type { Phase, SampleRecorder, SampleTensors, StepRecord, TensorIo, TensorValues } from './types'
export { buildWalk, type WalkOp } from './walk'

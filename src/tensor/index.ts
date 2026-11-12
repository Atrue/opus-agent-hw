/**
 * ЕДИНСТВЕННАЯ публичная точка входа тензорной библиотеки (R2): приложение
 * импортирует движок только отсюда; внутренние модули tensor/… недоступны
 * снаружи (граница enforce'ится oxlint no-restricted-imports + тестом границ).
 */

export { Tensor, type OpName, type TensorInit } from './tensor'
export { F } from './functional'
export { SGD } from './optim'
export { buildModel, ScenarioNet, type LayerSpec, type ModelSpec, type ForwardTensors } from './model'
export { Value, type ScalarOp, type ValueInit } from './value'
export {
  expandScalar,
  type ExpandRequest,
  type LazyExpansion,
  type Operand,
  type TensorSnapshot,
} from './expanders'
export {
  SampleCursor,
  buildWalk,
  tensorIo,
  tensorValuesOf,
  gradIo,
  type Phase,
  type SampleRecorder,
  type SampleTensors,
  type StepRecord,
  type TensorIo,
  type TensorValues,
  type WalkOp,
} from './trace'

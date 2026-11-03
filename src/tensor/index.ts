/**
 * ЕДИНСТВЕННАЯ публичная точка входа тензорной библиотеки (R2): приложение
 * импортирует движок только отсюда; внутренние модули tensor/… недоступны
 * снаружи (граница enforce'ится oxlint no-restricted-imports + тестом границ).
 */

export { Tensor, type OpName, type TensorInit } from './tensor'
export { F } from './functional'
export { SGD } from './optim'
export { MLP, type MlpStartWeights, type MlpForward } from './model'
export {
  SampleCursor,
  OPS_PER_SAMPLE,
  tensorIo,
  tensorValuesOf,
  gradIo,
  type Phase,
  type SampleRecorder,
  type SampleTensors,
  type StepRecord,
  type TensorIo,
  type TensorValues,
} from './trace'

/**
 * Баррел домена scenario/ — декларативные модели сценариев (D-30/D-31) и
 * реестр. Импорт-спецификаторы './scenario' и '../run/scenario' у
 * потребителей не меняются (D-34). Сценарий = файл данных: фаза 3
 * добавляет MLP-спек файлом в эту папку.
 */
export { NEURON_SCENARIO } from './neuron'
export { activateScenario, activeScenario, netShapeOf } from './registry'
export type {
  FormulaSeg,
  FormulaToken,
  LayerSymbols,
  NodeBinding,
  RenderEdge,
  RenderNode,
  RenderNodeKind,
  RenderNodeRole,
  RenderSegment,
  RenderSeries,
  ScenarioModel,
  ScenarioOpMeta,
  ScenarioRender,
  SeriesNodePick,
} from './types'
export { XOR_SCENARIO, XOR_START_WEIGHTS } from './xor'

/**
 * Корень прогона (R4): класс TrainingRun — модульный синглтон, чистый TS +
 * Set-listeners; useRunSlice поверх useSyncExternalStore; window.__run для
 * DevTools-прозрачности. Здесь же buildStepRecord — снимок операции движка
 * в StepRecord (форма шага прототипа, schemaVersion 1).
 *
 * RED-скелет: запись шага не реализована.
 */

import { gradIo, tensorIo, type SampleCursor, type StepRecord } from '../tensor'
import { XOR_SCENARIO } from './scenario'

const PROV_WEIGHT = 'вес модели (стартовые константы сценария)'
const PROV_INPUT = 'входные данные — граница графа'
const PROV_TARGET = 'метка — граница графа'
const PROV_LR = 'гиперпараметр SGD'

function stepProv(opIndex: number): string {
  const meta = XOR_SCENARIO.opMeta[opIndex]!
  return `шаг ${String(opIndex + 1)} (${meta.op})`
}

/**
 * Снимок выполненной операции opIndex в StepRecord: входы/выходы/градиенты
 * копируются из живых тензоров курсора в момент записи (заморозка чисел).
 */
export function buildStepRecord(_cursor: SampleCursor, _opIndex: number): StepRecord {
  void tensorIo
  void gradIo
  void PROV_WEIGHT
  void PROV_INPUT
  void PROV_TARGET
  void PROV_LR
  void stepProv
  throw new Error('buildStepRecord: не реализовано (RED)')
}

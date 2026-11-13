/**
 * Реестр сценариев (перенос из scenario.ts телом, D-34): белый список id →
 * спек, активный сценарий сессии (фиксируется по URL до создания прогона,
 * D-31) и форма сети для подписей. scenarioById — внутренняя функция
 * реестра (внешних потребителей нет, аудит ревью 02-11).
 */

import { NEURON_SCENARIO } from './neuron'
import type { ScenarioModel } from './types'
import { XOR_SCENARIO } from './xor'

const SCENARIOS: Readonly<Record<string, ScenarioModel>> = {
  neuron: NEURON_SCENARIO,
  xor: XOR_SCENARIO,
}

/** Спец по id из белого списка url (невалидное клампится к дефолту). */
function scenarioById(id: string): ScenarioModel {
  return SCENARIOS[id] ?? NEURON_SCENARIO
}

let currentScenario: ScenarioModel = NEURON_SCENARIO

/** Активный сценарий сессии (фиксируется один раз на старте по URL). */
export function activeScenario(): ScenarioModel {
  return currentScenario
}

/** Фиксация активного сценария (run.ts по parseHash до первого рендера). */
export function activateScenario(id: string): void {
  currentScenario = scenarioById(id)
}

/** Форма сети для подписей («2-3-1» / «2-1») — механическая производная net. */
export function netShapeOf(spec: ScenarioModel): string {
  return [spec.net[0]!.inputs, ...spec.net.map((l) => l.units)].join('-')
}

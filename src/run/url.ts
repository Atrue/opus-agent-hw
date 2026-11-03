/**
 * URL-state (R3): hash несёт ТОЛЬКО сценарий (#scenario=xor); параметры
 * позиции и режима из URL убраны — reload = честный сброс прогона, лекционный
 * режим — toggle без URL. Единственный внешний «ввод» приложения: невалидное
 * или чужое значение клампится к дефолтному сценарию (threat T-01.1-01).
 *
 * Модуль чистый (без зависимостей от store/DOM): App инициализирует hash до
 * первого рендера и пишет через history.replaceState только при смене
 * сценария (в v1 сценарий всегда один).
 */

export interface UrlState {
  scenario: string
}

export const DEFAULT_SCENARIO = 'xor'

/** Известные сценарии (литеральные имена — всё прочее невалидно). */
const KNOWN_SCENARIOS: readonly string[] = ['xor']

/** parseHash: никогда не бросает; принимает только литеральное имя известного сценария. */
export function parseHash(hash: string): UrlState {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const scenario = params.get('scenario')
  return { scenario: scenario !== null && KNOWN_SCENARIOS.includes(scenario) ? scenario : DEFAULT_SCENARIO }
}

/** toHash: каноническая сериализация — только сценарий. */
export function toHash(scenario: string): string {
  return `#scenario=${scenario}`
}

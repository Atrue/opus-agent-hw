/**
 * URL-state (микропроверка DOCS-05): hash `#step=N&mode=lecture` — source of
 * truth для шага и режима. Перезагрузка той же ссылки восстанавливает
 * состояние. Единственный внешний «ввод» приложения: всё невалидное
 * клампится к дефолту (threat T-1-04), мусорные ключи игнорируются.
 *
 * Модуль чистый (никаких зависимостей от store/DOM) — интеграция в App:
 * подписка на стор пишет history.replaceState(null, "", toHash(...)),
 * при старте parseHash(location.hash) инициализирует стор до первого рендера.
 */

export interface UrlState {
  step: number
  lecture: boolean
}

/** Последний валидный индекс шага прототипа (14 шагов: 0..13). */
export const MAX_STEP = 13

/**
 * parseHash: невалидный/подделанный hash никогда не бросает и не даёт
 * out-of-range значений: step клампится к [0, maxStep], mode принимает
 * только литеральное "lecture", неизвестные ключи игнорируются.
 */
export function parseHash(hash: string, maxStep: number = MAX_STEP): UrlState {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const rawStep = Number.parseInt(params.get('step') ?? '', 10)
  const step = Number.isFinite(rawStep) ? Math.min(Math.max(rawStep, 0), maxStep) : 0
  return { step, lecture: params.get('mode') === 'lecture' }
}

/** toHash: каноническая сериализация (step всегда, mode — только lecture). */
export function toHash(step: number, lecture: boolean): string {
  return `#step=${step}${lecture ? '&mode=lecture' : ''}`
}

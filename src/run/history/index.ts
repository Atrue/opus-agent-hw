/**
 * Баррел домена history/ — история обучения (UX-05/UX-06): чистые
 * построители поверх per-sample истории сессии. Импорт-спецификаторы
 * './history' и '../run/history' у потребителей не меняются (D-34).
 * LINK_HISTORY_CAP — внутренняя константа linkHistory (внешних
 * потребителей нет, аудит ревью 02-11).
 */
export { buildLossChartData, type LossChartData, type LossPoint } from './lossChart'
export { capLinkHistory, linkHistoryOf, type LinkHistoryPoint, type LinkSeries } from './linkHistory'
export { seriesOf } from './series'
export { sessionGeometryOf, type SessionGeometry, WEIGHT_ROWS } from './session'

/**
 * Модульный синглтон — единственный реактивный корень прогона (R4).
 *
 * Активный сценарий фиксируется по URL ДО создания прогона (D-31: дефолт
 * neuron — первый урок; #scenario=xor выбирает XOR до фазы 3): parseHash
 * клампит невалидное к дефолту (T-01.1-01), url.ts остаётся чистым модулем —
 * DOM читается только здесь. Модули UI, строящие таблицы на init
 * (compGraph/chainLinks), импортируются после run.ts — activeScenario()
 * возвращает уже зафиксированный сценарий.
 */

import { activateScenario, activeScenario } from './scenario'
import { TrainingRun } from './trainingRun'
import { parseHash } from './url'

const hash = typeof window === 'undefined' ? '' : window.location.hash
activateScenario(parseHash(hash).scenario)

export const run = new TrainingRun(activeScenario())

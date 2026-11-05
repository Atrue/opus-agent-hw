import { useRunSlice } from '../run/runState'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * Экран завершения эпохи (R3): замещает содержимое слота панели (как
 * NumberDrilldown) после последней операции эпохи — в пошаговом режиме и
 * после fast-forward. L до/после по лосс-точкам эпохи, точность на наборе
 * эпохи (доля верно классифицированных сэмплов порогом 0.5), числа через
 * formatKey — NaN/пустых состояний нет (DOCS-01 edge). Продолжение —
 * primary-кнопка «Следующая эпоха» в контролах (btn-epoch-next): эпохи
 * следуют бесконечно, терминального состояния нет.
 */
export default function EpochSummary() {
  const summaries = useRunSlice((r) => r.completedEpochs)
  const sampleCount = useRunSlice((r) => r.scenario.samples.length)
  // экран открывается только с завершённой эпохой — сводка всегда есть
  const summary = summaries.length > 0 ? summaries[summaries.length - 1] : null
  if (summary === null) return null

  return (
    <div data-testid="epoch-summary" className="card h-full overflow-auto">
      <div className="card-head">
        <span className="icon" aria-hidden="true">
          flag
        </span>
        <h2 data-testid="epoch-title" className="card-title">
          Эпоха {summary.epoch} завершена
        </h2>
        <span className="card-meta ui-label">точность {formatKey(summary.accuracy)}</span>
      </div>
      <div className="flex flex-col gap-2">
        <p data-testid="epoch-loss-before" className="num text-on-surface">
          <SubscriptText text="L в начале эпохи" /> = {formatKey(summary.lossBefore)}
        </p>
        <p data-testid="epoch-loss-after" className="num text-on-surface">
          <SubscriptText text="L в конце эпохи" /> = {formatKey(summary.lossAfter)}
        </p>
      </div>
      <p data-testid="epoch-accuracy" className="num text-on-surface">
        Точность: {formatKey(summary.accuracy)} ({summary.correct} из {sampleCount} верно, порог 0.5)
      </p>
      <p className="ui-text text-on-surface-variant">
        «Следующая эпоха» продолжает обучение — эпохи не кончаются. Числа этой эпохи идентичны пошагово и после
        «Запустить эпоху ⏩».
      </p>
    </div>
  )
}

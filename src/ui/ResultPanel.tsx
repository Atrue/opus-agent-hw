import { useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * «Результат — текущий пример» (01.2-05, пункты 3/8 UAT): фокус-карточка
 * правой колонки — что ПРОИСХОДИТ с текущим примером (обзор «на чём учится
 * сеть» живёт отдельно — ExamplesPanel в полосе истории). Все входы текущего
 * примера (x₁ = …, x₂ = …), метка y, выход ŷ и лосс L — те же live-срезы,
 * что питали прежний блок результата (sampleOpValues: оп 5 — ŷ, оп 6 — L),
 * тренд L ↓/↑ против предыдущей лосс-точки и вердикт порогом 0.5 (логика
 * движка). Сюда же из статус-бара переехали моно-метрики LOSS (последний
 * вычисленный лосс сессии — epochLossPoints last) и LR (η из сценария).
 * До вычисления — «н/д» (Empty, DESIGN.md §6); лекционный режим масштабирует
 * через --num-size. Данные — только опубликованные срезы прогона, новых
 * вычислений нет.
 */
export default function ResultPanel() {
  const sampleIndex = useRunSlice((r) => r.sampleIndex)
  const values = useRunSlice((r) => r.sampleOpValues)
  const lossPoints = useRunSlice((r) => r.epochLossPoints)

  const sample = XOR_SCENARIO.samples[sampleIndex]!
  const yhat = values[5]
  const loss = values[6]
  const decided = yhat !== undefined && loss !== undefined
  const correct = decided ? (yhat >= 0.5) === (sample.y >= 0.5) : null
  const prev = lossPoints.length >= 2 ? lossPoints[lossPoints.length - 2]! : null
  const trendDown = decided && prev !== null && loss! < prev
  const lastLoss = lossPoints.length > 0 ? lossPoints[lossPoints.length - 1]! : null

  const verdictClass = correct === null ? 'text-on-surface-variant' : correct ? 'text-primary' : 'text-error'
  const verdictText = correct === null ? 'ŷ и L появятся по ходу прохода' : correct ? '✓ Верно' : 'Не сошлось'

  return (
    <section aria-label="Результат — текущий пример" data-testid="result-zone" className="card shrink-0">
      <div className="card-head">
        <span className="icon" aria-hidden="true">
          check_circle
        </span>
        <h2 className="card-title">Результат</h2>
        <span className="card-meta ui-label">текущий пример</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">вход</span>
          <span className="result-value text-on-surface">
            <SubscriptText text="x1" /> = {sample.x[0]}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">вход</span>
          <span className="result-value text-on-surface">
            <SubscriptText text="x2" /> = {sample.x[1]}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">метка</span>
          <span className="result-value text-on-surface">y = {sample.y}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">выход</span>
          <span className="result-value text-on-surface">ŷ = {decided ? formatKey(yhat!) : 'н/д'}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">лосс</span>
          <span className="result-value text-on-surface">
            L = {decided ? formatKey(loss!) : 'н/д'}
            {decided && prev !== null ? <span className="result-trend">{trendDown ? '↓' : '↑'}</span> : null}
          </span>
        </div>
      </div>
      <p data-testid="result-verdict" className={`ui-label min-h-[1lh] ${verdictClass}`}>
        {verdictText}
      </p>
      {/* моно-метрики из статус-бара (пункт 8 UAT): LOSS — последний
          вычисленный лосс сессии (тот же источник, что был в футере),
          LR — η из сценария */}
      <div className="num flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span>
          LOSS <span className="text-on-surface-variant">{lastLoss === null ? 'н/д' : formatKey(lastLoss)}</span>
        </span>
        <span>
          LR <span className="text-on-surface-variant">{formatKey(XOR_SCENARIO.lr)}</span>
        </span>
      </div>
    </section>
  )
}

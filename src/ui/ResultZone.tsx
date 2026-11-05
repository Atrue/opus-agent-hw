import { useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { formatKey } from '../format/numbers'

/**
 * Зона результата (redesign 2026-11-05): результат сэмпла всегда на экране —
 * ŷ, y и L крупным моно + вердикт классификации порогом 0.5 (та же логика,
 * что у epochCorrect движка; DESIGN.md §6: «✓ Верно» / «Не сошлось»).
 * Данные — только опубликованные срезы прогона: sampleOpValues (оп 6 — ŷ,
 * оп 7 — L) и лосс-точки эпохи для тренда; новых вычислений нет. До первого
 * вычисления — «н/д» (Empty, DESIGN.md §6). Лекционный режим масштабирует
 * через --num-size. Тренд L (↓/↑ против предыдущей лосс-точки) —
 * функциональный глиф, цвет — нейтральный.
 */
export default function ResultZone() {
  const sampleIndex = useRunSlice((r) => r.sampleIndex)
  const values = useRunSlice((r) => r.sampleOpValues)
  const lossPoints = useRunSlice((r) => r.epochLossPoints)

  const yhat = values[5]
  const loss = values[6]
  const y = XOR_SCENARIO.samples[sampleIndex]!.y
  const decided = yhat !== undefined && loss !== undefined
  const correct = decided ? (yhat >= 0.5) === (y >= 0.5) : null
  const prev = lossPoints.length >= 2 ? lossPoints[lossPoints.length - 2]! : null
  const trendDown = decided && prev !== null && loss! < prev

  const verdictClass = correct === null ? 'text-on-surface-variant' : correct ? 'text-primary' : 'text-error'
  const verdictText = correct === null ? 'ŷ и L появятся по ходу прохода' : correct ? '✓ Верно' : 'Не сошлось'

  return (
    <section aria-label="Результат сэмпла" data-testid="result-zone" className="card shrink-0">
      <div className="card-head">
        <span className="icon" aria-hidden="true">
          target
        </span>
        <h2 className="card-title">Результат сэмпла</h2>
        <span className="card-meta ui-label">порог 0.5</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">выход ŷ</span>
          <span className="result-value text-on-surface">{decided ? formatKey(yhat!) : 'н/д'}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">метка y</span>
          <span className="result-value text-on-surface">{formatKey(y)}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="ui-label text-on-surface-variant">лосс L</span>
          <span className="result-value text-on-surface">
            {decided ? formatKey(loss!) : 'н/д'}
            {decided && prev !== null ? <span className="result-trend">{trendDown ? '↓' : '↑'}</span> : null}
          </span>
        </div>
      </div>
      <p data-testid="result-verdict" className={`ui-label min-h-[1lh] ${verdictClass}`}>
        {verdictText}
      </p>
    </section>
  )
}

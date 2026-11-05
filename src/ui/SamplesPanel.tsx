import { useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { formatKey } from '../format/numbers'

/**
 * «Примеры и результат» (01.2-02, пункт 3 ТЗ; эволюция зоны результата):
 * ВСЕ примеры обучающей выборки — вход x → метка y; у пройденных в текущей
 * эпохе — выход ŷ и вердикт ✓/✗ порогом 0.5 (та же логика, что у движка);
 * текущий пример подсвечен. Ниже — крупный блок текущего примера (ŷ, y, L,
 * тренд, вердикт — как в зоне результата). Строки — индикаторы, НЕ навигация:
 * прогон forward-only, клик по непройденному примеру ничего не делает.
 *
 * Данные — только опубликованные срезы прогона: sampleHistory текущего
 * runId+epoch (ŷ/вердикты пройденных) + live sampleOpValues текущего (крупный
 * блок: оп 5 — ŷ, оп 6 — L); новых вычислений нет. До первого вычисления —
 * «н/д» (Empty, DESIGN.md §6). Лекционный режим масштабирует через --num-size.
 */
export default function SamplesPanel() {
  const sampleIndex = useRunSlice((r) => r.sampleIndex)
  const values = useRunSlice((r) => r.sampleOpValues)
  const lossPoints = useRunSlice((r) => r.epochLossPoints)
  const runId = useRunSlice((r) => r.runId)
  const epoch = useRunSlice((r) => r.epoch)
  const history = useRunSlice((r) => r.sampleHistory)

  // пройденные примеры текущей эпохи текущего прогона (из per-sample истории)
  const done = new Map<number, { yhat: number; correct: boolean }>()
  for (const rec of history) {
    if (rec.kind !== 'sample' || rec.runId !== runId || rec.epoch !== epoch) continue
    done.set(rec.sampleIndex, { yhat: rec.yhat, correct: rec.correct })
  }

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
    <section aria-label="Примеры и результат" data-testid="samples-panel" className="card shrink-0">
      <div className="card-head">
        <span className="icon" aria-hidden="true">
          target
        </span>
        <h2 className="card-title">Примеры и результат</h2>
        <span className="card-meta ui-label">порог 0.5</span>
      </div>
      <div className="samples-list" role="list" aria-label="Примеры обучающей выборки">
        {XOR_SCENARIO.samples.map((sample, i) => {
          const rec = done.get(i)
          const current = i === sampleIndex
          return (
            <div
              key={i}
              role="listitem"
              aria-current={current ? 'true' : undefined}
              data-testid="sample-row"
              data-index={i}
              className={`sample-row num${current ? ' sample-row-current' : ''}`}
            >
              <span className="sample-io">
                {sample.x[0]}
                {sample.x[1]} → {sample.y}
              </span>
              <span className="sample-out">
                {rec ? (
                  <>
                    <span className="ui-label text-on-surface-variant">ŷ</span> {formatKey(rec.yhat)}{' '}
                    <span className={rec.correct ? 'sample-verdict-ok' : 'sample-verdict-miss'} aria-label={rec.correct ? 'верно' : 'не сошлось'}>
                      {rec.correct ? '✓' : '✗'}
                    </span>
                  </>
                ) : null}
              </span>
            </div>
          )
        })}
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

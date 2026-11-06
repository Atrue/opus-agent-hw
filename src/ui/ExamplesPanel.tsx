import { useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { formatKey } from '../format/numbers'

/**
 * «Примеры» (01.2-05, пункт 3 UAT; эволюция SamplesPanel 01.2-02): чистая
 * таблица обучающей выборки — 4 строки вход x → метка y; у пройденных в
 * текущей эпохе — выход ŷ и вердикт ✓/✗ порогом 0.5 (та же логика, что у
 * движка); текущий пример подсвечен. Карточка живёт в полосе истории рядом
 * с графиком лосса («на чём учится сеть»); крупный блок текущего примера
 * («что с ним происходит») переехал в ResultPanel. Строки — индикаторы,
 * НЕ навигация: прогон forward-only, клик по непройденному примеру ничего
 * не делает.
 *
 * testid samples-panel/sample-row и классы вердиктов сохранены — контракт
 * e2e-теста 9 (карточка где бы ни жила). Данные — только опубликованные
 * срезы прогона (sampleHistory текущего runId+epoch); новых вычислений нет.
 */
export default function ExamplesPanel() {
  const sampleIndex = useRunSlice((r) => r.sampleIndex)
  const runId = useRunSlice((r) => r.runId)
  const epoch = useRunSlice((r) => r.epoch)
  const history = useRunSlice((r) => r.sampleHistory)

  // пройденные примеры текущей эпохи текущего прогона (из per-sample истории)
  const done = new Map<number, { yhat: number; correct: boolean }>()
  for (const rec of history) {
    if (rec.kind !== 'sample' || rec.runId !== runId || rec.epoch !== epoch) continue
    done.set(rec.sampleIndex, { yhat: rec.yhat, correct: rec.correct })
  }

  return (
    <section aria-label="Примеры" data-testid="samples-panel" className="card min-h-[220px]">
      <div className="card-head">
        <span className="icon" aria-hidden="true">
          target
        </span>
        <h2 className="card-title">Примеры</h2>
        <span className="card-meta ui-label">выборка XOR</span>
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
    </section>
  )
}

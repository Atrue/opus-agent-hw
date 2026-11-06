import { useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * «Примеры» (01.2-05; таблица-датасет — 01.2-07, пункт 8 цикла 2): обучающая
 * выборка как таблица, где КОЛОНКИ = названия переменных (x₁ | x₂ | y | ŷ | ✓),
 * строки = примеры; у пройденных в текущей эпохе — выход ŷ и вердикт порогом
 * 0.5 (та же логика, что у движка); текущий пример подсвечен. Карточка живёт
 * в полосе истории рядом с графиком лосса; фокус-блок текущего примера —
 * ResultPanel. Строки — индикаторы, НЕ навигация (forward-only).
 *
 * testid samples-panel/sample-row и классы вердиктов сохранены — контракт
 * e2e-теста 9. Данные — только опубликованные срезы прогона (sampleHistory
 * текущего runId+epoch); новых вычислений нет.
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
      <div className="samples-table-wrap">
        <table className="samples-table num" aria-label="Примеры обучающей выборки: переменные по колонкам">
          <thead>
            <tr>
              <th scope="col" className="ui-label text-on-surface-variant">
                <SubscriptText text="x1" />
              </th>
              <th scope="col" className="ui-label text-on-surface-variant">
                <SubscriptText text="x2" />
              </th>
              <th scope="col" className="ui-label text-on-surface-variant">
                y
              </th>
              <th scope="col" className="ui-label text-on-surface-variant">
                ŷ
              </th>
              <th scope="col" className="ui-label text-on-surface-variant" aria-label="вердикт">
                ✓
              </th>
            </tr>
          </thead>
          <tbody>
            {XOR_SCENARIO.samples.map((sample, i) => {
              const rec = done.get(i)
              const current = i === sampleIndex
              return (
                <tr
                  key={i}
                  aria-current={current ? 'true' : undefined}
                  data-testid="sample-row"
                  data-index={i}
                  className={`sample-row${current ? ' sample-row-current' : ''}`}
                >
                  <td>{sample.x[0]}</td>
                  <td>{sample.x[1]}</td>
                  <td>{sample.y}</td>
                  <td>{rec ? formatKey(rec.yhat) : '·'}</td>
                  <td>
                    {rec ? (
                      <span
                        className={rec.correct ? 'sample-verdict-ok' : 'sample-verdict-miss'}
                        aria-label={rec.correct ? 'верно' : 'не сошлось'}
                      >
                        {rec.correct ? '✓' : '✗'}
                      </span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

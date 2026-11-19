import { useLayoutEffect, useRef } from 'react'
import { useRunSlice } from '../../run/useRunSlice'
import { activeScenario } from '../../run/scenario'
import { formatKey } from '../../format'
import { Card, CardAction, CardHeader, CardTitle } from '../kit'
import { SubscriptText } from '../typography/SubscriptText'

/**
 * «Примеры» (01.2-05; таблица-датасет — 01.2-07, пункт 8 цикла 2): обучающая
 * выборка как таблица, где КОЛОНКИ = названия переменных (x₁ | x₂ | y | ŷ | ✓),
 * строки = примеры; у пройденных в текущей эпохе — выход ŷ и вердикт порогом
 * 0.5 (та же логика, что у движка); текущий пример подсвечен. Карточка живёт
 * в полосе истории рядом с графиком лосса; фокус-блок текущего примера —
 * ResultPanel. Строки — индикаторы, НЕ навигация (forward-only).
 *
 * Фаза 3 (ревью владельца 03-05): подсветка текущей строки ПЕРЕЕЗЖАЕТ —
 * гало-оверлей .samples-row-halo (тот же паттерн, что гало ленты шагов):
 * позиция = offsetTop/offsetHeight текущей строки (функция структуры),
 * плавность — CSS-transition 250 мс; ŷ/вердикты приезжают fade+rise.
 *
 * testid samples-panel/sample-row и классы вердиктов сохранены — контракт
 * e2e-теста 9. Данные — только опубликованные срезы прогона (sampleHistory
 * текущего runId+epoch); новых вычислений нет.
 */
export function ExamplesPanel() {
  const sampleIndex = useRunSlice((r) => r.sampleIndex)
  const runId = useRunSlice((r) => r.runId)
  const epoch = useRunSlice((r) => r.epoch)
  const history = useRunSlice((r) => r.sampleHistory)
  const spec = activeScenario()
  const wrapRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)

  // пройденные примеры текущей эпохи текущего прогона (из per-sample истории)
  const done = new Map<number, { yhat: number; correct: boolean }>()
  for (const rec of history) {
    if (rec.kind !== 'sample' || rec.runId !== runId || rec.epoch !== epoch) continue
    done.set(rec.sampleIndex, { yhat: rec.yhat, correct: rec.correct })
  }

  // travel-гало строки: цель = геометрия текущей строки (offsetTop к wrap —
  // positional-предок); useLayoutEffect ставит до отрисовки (первый кадр
  // без анимации), далее transition перевозит к следующей строке
  useLayoutEffect(() => {
    const halo = haloRef.current
    const wrap = wrapRef.current
    if (halo === null || wrap === null) return
    const row = wrap.querySelector(`[data-index="${String(sampleIndex)}"]`)
    if (row === null || !(row instanceof HTMLTableRowElement)) {
      halo.style.opacity = '0'
      return
    }
    halo.style.opacity = '1'
    halo.style.height = `${String(row.offsetHeight)}px`
    halo.style.transform = `translateY(${String(row.offsetTop)}px)`
  }, [sampleIndex])

  return (
    <Card aria-label="Примеры" data-testid="samples-panel" className="min-h-[220px]">
      <CardHeader>
        <span className="icon" aria-hidden="true">
          target
        </span>
        <CardTitle>Примеры</CardTitle>
        <CardAction className="ui-label">{spec.datasetLabel}</CardAction>
      </CardHeader>
      <div className="samples-table-wrap" ref={wrapRef}>
      <div ref={haloRef} className="samples-row-halo" aria-hidden="true" />
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
            {spec.samples.map((sample, i) => {
              const rec = done.get(i)
              const current = i === sampleIndex
              return (
                <tr
                  key={`${sample.x[0]}-${sample.x[1]}`}
                  aria-current={current ? 'true' : undefined}
                  data-testid="sample-row"
                  data-index={i}
                  className={`sample-row${current ? ' sample-row-current' : ''}`}
                >
                  <td>{sample.x[0]}</td>
                  <td>{sample.x[1]}</td>
                  <td>{sample.y}</td>
                  <td>
                    {rec ? (
                      <span className="sample-arrive">{formatKey(rec.yhat)}</span>
                    ) : (
                      '·'
                    )}
                  </td>
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
    </Card>
  )
}

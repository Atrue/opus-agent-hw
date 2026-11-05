import { useRunSlice } from '../run/runState'
import { capLinkHistory, linkHistoryOf, type LinkHistoryPoint, type LinkSeries } from '../run/history'
import { liveValues } from './LinkPanel'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'
import type { SegmentId } from './chainLinks'

/**
 * История звена (01.2-02, пункт 4 ТЗ): раскрывающаяся секция в панели звена
 * (details-паттерн, свёрнута по умолчанию; testid link-history) — значения
 * по СЭМПЛАМ из per-sample истории сессии (linkHistoryOf). Скалярный ряд —
 * спарклайн SVG (hand-rolled по образцу LossChart, без новых зависимостей;
 * тики — границы эпох, вертикали — границы прогонов) + последние значения
 * текстом; многомерный символ — мини-таблица (строки = компоненты, столбцы
 * = границы сэмплов, столбцы «старт» — стартовые константы прогона).
 * live-значение (живые тензоры текущего прогона) — отдельной строкой.
 * Потолок отображения — последние ~40 точек, скрытое — «+N раньше».
 */

const SPARK_W = 220
const SPARK_H = 44

/** Спарклайн скалярного ряда: точки сэмплов + тики эпох + вертикали прогонов. */
function Sparkline({ points }: { points: readonly LinkHistoryPoint[] }) {
  const values = points.map((p) => p.value)
  const lo = Math.min(...values)
  const hiRaw = Math.max(...values)
  const hi = hiRaw === lo ? lo + 1 : hiRaw
  const maxX = Math.max(1, points.length - 1)
  const px = (i: number): number => (SPARK_W * i) / maxX
  const py = (v: number): number => SPARK_H - 3 - ((SPARK_H - 6) * (v - lo)) / (hi - lo)
  const guides: React.JSX.Element[] = []
  points.forEach((p, i) => {
    const prev = points[i - 1]
    if (prev === undefined) return
    if (p.runId !== prev.runId) {
      guides.push(
        <line
          key={`run-${String(i)}`}
          x1={px(i)}
          y1={2}
          x2={px(i)}
          y2={SPARK_H - 2}
          style={{ stroke: 'var(--color-outline)', strokeWidth: 1, strokeDasharray: '3 3' }}
        />,
      )
    } else if (p.epoch !== prev.epoch) {
      guides.push(
        <line key={`epoch-${String(i)}`} x1={px(i)} y1={SPARK_H - 8} x2={px(i)} y2={SPARK_H - 2} style={{ stroke: 'var(--color-outline-variant)', strokeWidth: 1 }} />
      )
    }
  })
  return (
    <svg
      data-testid="link-sparkline"
      role="img"
      aria-label="Спарклайн истории по сэмплам"
      className="link-sparkline"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
    >
      {guides}
      <polyline
        style={{ stroke: 'var(--color-phase-fwd)', fill: 'none', strokeWidth: 1.5 }}
        points={points.map((p, i) => `${px(i)},${py(p.value)}`).join(' ')}
      />
    </svg>
  )
}

/** Скалярный ряд: спарклайн + последние значения текстом (formatKey). */
function SingleSeries({ series }: { series: LinkSeries }) {
  const { shown } = capLinkHistory(series.points)
  const last = shown.slice(-3)
  return (
    <div className="link-history-single">
      <Sparkline points={shown} />
      <p className="num link-history-last">
        <span className="ui-label text-on-surface-variant">последние:</span>{' '}
        {last.map((p, k) => (
          <span key={`${String(p.runId)}-${String(p.epoch)}-${String(p.sampleIndex)}`}>
            {k > 0 ? ', ' : ''}
            <span data-testid="link-value">{formatKey(p.value)}</span>
          </span>
        ))}
      </p>
    </div>
  )
}

/** Метаданные столбца мини-таблицы: граница прогона/эпохи слева. */
function columnClass(points: readonly LinkHistoryPoint[], i: number): string {
  const prev = points[i - 1]
  if (prev === undefined || points[i]!.runId !== prev.runId) return 'col-run-start'
  if (points[i]!.epoch !== prev.epoch) return 'col-epoch-start'
  return ''
}

/** Многомерный символ: мини-таблица «компоненты × сэмплы» (столбец «старт» —
 *  стартовые константы прогона; левая граница столбца маркирует эпоху/прогон). */
function MultiSeries({ series }: { series: readonly LinkSeries[] }) {
  const { shown } = capLinkHistory(series[0]!.points)
  return (
    <div className="link-history-scroll">
      <table className="link-history-table" aria-label="История звена по сэмплам">
        <thead>
          <tr>
            <th className="ui-label text-on-surface-variant">{'\u00A0'}</th>
            {shown.map((p, i) => (
              <th
                key={`col-${String(i)}`}
                className={`ui-label text-on-surface-variant text-right ${columnClass(shown, i)}`}
                scope="col"
              >
                {p.sampleIndex < 0 ? 'старт' : `${String(p.epoch)}·${String(p.sampleIndex + 1)}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s) => {
            const rowsShown = capLinkHistory(s.points).shown
            return (
              <tr key={s.label}>
                <th scope="row" className="link-history-rowhead">
                  <SubscriptText text={s.label} />
                </th>
                {rowsShown.map((p, i) => (
                  <td key={`cell-${String(i)}`} className={`text-right ${columnClass(rowsShown, i)}`}>
                    <span data-testid="link-value">{formatKey(p.value)}</span>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function LinkHistory({ segment, symbol }: { segment: SegmentId; symbol: string }) {
  const history = useRunSlice((r) => r.sampleHistory)
  const { series } = linkHistoryOf(history, segment, symbol)
  const live = liveValues(symbol)
  const total = series[0]?.points.length ?? 0
  const { hidden } = capLinkHistory(series[0]?.points ?? [])

  return (
    <details data-testid="link-history" className="link-history">
      <summary className="ui-label link-history-summary">
        История по сэмплам: <SubscriptText text={symbol} />
        {series.length > 1 ? ` — ${String(series.length)} рядов` : ''}
      </summary>
      <div className="link-history-body">
        {total === 0 ? (
          <p className="ui-label text-on-surface-variant">История появится после первого сэмпла</p>
        ) : (
          <>
            {hidden > 0 ? (
              <p className="ui-label link-history-cap" data-testid="link-history-cap">
                +{String(hidden)} раньше
              </p>
            ) : null}
            {series.length === 1 ? <SingleSeries series={series[0]!} /> : <MultiSeries series={series} />}
          </>
        )}
        {live !== null && live.length > 0 ? (
          <p className="num link-history-live" data-testid="link-history-live">
            <span className="ui-label text-on-surface-variant">сейчас:</span> <SubscriptText text={symbol} /> ={' '}
            {live
              .slice(0, 3)
              .map((v) => formatKey(v))
              .join(', ')}
            {live.length > 3 ? ` +${String(live.length - 3)}` : ''}
          </p>
        ) : null}
      </div>
    </details>
  )
}

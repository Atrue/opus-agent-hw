import { useRunSlice } from '../run/runState'
import { buildLossChartData, sessionGeometryOf } from '../run/history'
import { SAMPLE_COUNT } from '../run/scenario'
import { formatKey } from '../format/numbers'

/**
 * График лосса (UX-05): SVG polyline по лосс-точкам текущей эпохи (ось —
 * сэмплы СЕССИИ: reset не стирает историю, прогоны разделены вертикальными
 * пунктирами) + точки завершённых эпох (lossAfter на накопительной границе).
 * Hand-rolled SVG по образцу ArchitectureDiagram, без новых зависимостей;
 * цвета — только ссылки на существующие токены; подписи чисел — formatKey.
 * Подписка селекторами истории (стабильные ссылки, R4): перерисовка только
 * при изменении своих данных.
 */

const VIEW_W = 600
const VIEW_H = 150
const PAD_L = 64 // место под подписи оси Y
const PAD_R = 16
const PAD_T = 14
const PAD_B = 22 // место под отметки эпох

export default function LossChart() {
  const lossPoints = useRunSlice((r) => r.epochLossPoints)
  const summaries = useRunSlice((r) => r.completedEpochs)
  const history = useRunSlice((r) => r.sampleHistory)
  const runId = useRunSlice((r) => r.runId)
  const epoch = useRunSlice((r) => r.epoch)
  const geometry = sessionGeometryOf(history, summaries.length, { runId, epoch })
  const chart = buildLossChartData(lossPoints, summaries, geometry)
  const hasData = chart.line.length > 0 || chart.dots.length > 0

  // шкала Y: одна точка/нулевой размах → паддинг, чтобы линия не клеилась к краю
  const yLo = chart.yMin
  const yHi = chart.yMax === yLo ? yLo + 1 : chart.yMax
  const maxX = Math.max(
    SAMPLE_COUNT,
    ...chart.dots.map((p) => p.x),
    ...chart.line.map((p) => p.x),
    ...chart.runBounds.map((b) => b + 1), // место под разделитель и первый сэмпл нового прогона
  )
  const px = (x: number): number => PAD_L + ((VIEW_W - PAD_L - PAD_R) * x) / maxX
  const py = (y: number): number => VIEW_H - PAD_B - ((VIEW_H - PAD_T - PAD_B) * (y - yLo)) / (yHi - yLo)

  return (
    <svg
      data-testid="loss-chart"
      role="img"
      aria-label="График лосса: линия по сэмплам текущей эпохи и точки завершённых эпох; прогоны разделены"
      className="h-full w-full"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {!hasData ? (
        <text x={VIEW_W / 2} y={VIEW_H / 2} textAnchor="middle" className="chart-label">
          Лосс появится после первой операции loss (L) текущего сэмпла
        </text>
      ) : (
        <>
          {/* ось Y: подписи отформатированными числами (UX-05) */}
          <text x={0} y={PAD_T + 4} className="chart-label">
            {formatKey(chart.yMax)}
          </text>
          <text x={0} y={VIEW_H - PAD_B} className="chart-label">
            {formatKey(chart.yMin)}
          </text>
          {/* разделители прогонов (01.2-02): вертикальный пунктир между последним
              сэмплом прошлого прогона и первым сэмплом нового */}
          {chart.runBounds.length > 0 ? (
            <g data-testid="run-dividers" aria-hidden="true">
              {chart.runBounds.map((b, k) => (
                <line
                  key={`run-${String(k)}`}
                  x1={px(b + 0.5)}
                  y1={PAD_T}
                  x2={px(b + 0.5)}
                  y2={VIEW_H - PAD_B}
                  style={{ stroke: 'var(--color-outline-variant)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
              ))}
            </g>
          ) : null}
          {/* линия текущей эпохи */}
          <polyline
            data-testid="loss-line"
            style={{ stroke: 'var(--color-phase-fwd)', fill: 'none', strokeWidth: 2 }}
            points={chart.line.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
          />
          {/* точки завершённых эпох + номер эпохи сводки под точкой */}
          {chart.dots.map((p, k) => (
            <g key={`epoch-${String(k)}`}>
              <circle
                data-testid="loss-dot"
                data-epoch={k + 1}
                style={{ fill: 'var(--color-phase-loss)' }}
                cx={px(p.x)}
                cy={py(p.y)}
                r={3.5}
              />
              <text x={px(p.x)} y={VIEW_H - PAD_B + 14} textAnchor="middle" className="chart-label">
                {String(summaries[k]!.epoch)}
              </text>
            </g>
          ))}
          {/* подпись оси X — сэмплы сессии (01.2-02) */}
          <text x={VIEW_W - PAD_R} y={VIEW_H - PAD_B + 14} textAnchor="end" className="chart-label">
            сэмплы
          </text>
        </>
      )}
    </svg>
  )
}

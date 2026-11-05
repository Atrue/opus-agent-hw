import { useRunSlice } from '../run/runState'
import { buildLossChartData } from '../run/history'
import { SAMPLE_COUNT } from '../run/scenario'
import { formatKey } from '../format/numbers'

/**
 * График лосса (UX-05): SVG polyline по лосс-точкам текущей эпохи (ось —
 * сэмплы) + точки сводок завершённых эпох (lossAfter на границе) — прогресс
 * обучения виден с первого шага. Hand-rolled SVG по образцу
 * ArchitectureDiagram, без новых зависимостей; цвета — только ссылки на
 * существующие токены (дизайн-токены зафиксированы, без перекраски);
 * подписи чисел — formatKey. Подписка селекторами истории (стабильные
 * ссылки, R4): перерисовка только при изменении своих данных.
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
  const chart = buildLossChartData(lossPoints, summaries)
  const hasData = chart.line.length > 0 || chart.dots.length > 0

  // шкала Y: одна точка/нулевой размах → паддинг, чтобы линия не клеилась к краю
  const yLo = chart.yMin
  const yHi = chart.yMax === yLo ? yLo + 1 : chart.yMax
  const maxX = Math.max(
    SAMPLE_COUNT,
    ...chart.dots.map((p) => p.x),
    ...chart.line.map((p) => p.x),
  )
  const px = (x: number): number => PAD_L + ((VIEW_W - PAD_L - PAD_R) * x) / maxX
  const py = (y: number): number => VIEW_H - PAD_B - ((VIEW_H - PAD_T - PAD_B) * (y - yLo)) / (yHi - yLo)

  return (
    <svg
      data-testid="loss-chart"
      role="img"
      aria-label="График лосса: линия по сэмплам текущей эпохи и точки завершённых эпох"
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
          {/* линия текущей эпохи */}
          <polyline
            data-testid="loss-line"
            style={{ stroke: 'var(--color-phase-fwd)', fill: 'none', strokeWidth: 2 }}
            points={chart.line.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
          />
          {/* точки завершённых эпох + отметка номера эпохи под точкой */}
          {chart.dots.map((p, k) => (
            <g key={`epoch-${k}`}>
              <circle
                data-testid="loss-dot"
                data-epoch={k + 1}
                style={{ fill: 'var(--color-phase-loss)' }}
                cx={px(p.x)}
                cy={py(p.y)}
                r={3.5}
              />
              <text x={px(p.x)} y={VIEW_H - PAD_B + 14} textAnchor="middle" className="chart-label">
                {String(k + 1)}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  )
}

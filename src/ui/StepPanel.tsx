import { Fragment } from 'react'
import { player } from '../player/store'
import type { TraceStep } from '../player/types'
import { formatKey } from '../format/numbers'
import { buildStepRows, type NumberRow } from './stepRows'
import SubscriptText from './SubscriptText'

/**
 * Панель шага — дефолтный вид: формула + входы/выходы/градиенты текущей op.
 * Изменившееся (step.changed) — gray-900 + accent-тинт #E69F00 @10%,
 * неизменившееся — gray-500. Числа не вычисляются — только форматирование
 * (Pattern 1); клик по числу → openDrill (панель NumberDrilldown — план 01-03).
 * Потолки чисел (≤7 ключевых / ≤30 на экране) обеспечивает чистая модель
 * stepRows.buildStepRows и проверяется тестами.
 */

function NumberRowView({ row, joiner }: { row: NumberRow; joiner: string }) {
  const valueClass = row.kind === 'input' || !row.changed ? 'value-unchanged' : 'value-changed'
  return (
    <div className={`num flex flex-wrap items-baseline gap-x-2 ${row.changed ? 'text-neutral-900' : 'text-neutral-500'}`}>
      <span>
        <SubscriptText text={row.sym} /> =
      </span>
      {row.values.map((v, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden="true">{joiner}</span>}
          <button
            type="button"
            className={`value-btn ${valueClass}`}
            data-ref={`${row.sym}[${i}]`}
            onClick={() => player.openDrill(`${row.sym}[${i}]`)}
          >
            {formatKey(v)}
          </button>
        </Fragment>
      ))}
      {row.hidden > 0 && <span className="value-unchanged">+{row.hidden}</span>}
    </div>
  )
}

export default function StepPanel({
  step,
  final,
}: {
  step: TraceStep
  final?: { lossBefore: number; lossAfter: number; gradNorm: number }
}) {
  const rows = buildStepRows(step)
  // update/summary: массив значений — «до -> после»
  const joiner = step.phase === 'update' || step.phase === 'summary' ? '->' : ','
  return (
    <div
      data-testid="step-panel"
      className="flex h-full flex-col gap-4 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <p data-testid="step-formula" className="num text-neutral-900">
        <SubscriptText text={step.formula} />
      </p>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <NumberRowView key={`${row.kind}:${row.sym}`} row={row} joiner={joiner} />
        ))}
        {step.phase === 'summary' && final !== undefined && (
          <div className="num value-unchanged">‖grad‖ = {formatKey(final.gradNorm)}</div>
        )}
      </div>
    </div>
  )
}

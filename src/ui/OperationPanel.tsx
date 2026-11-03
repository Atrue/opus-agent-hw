import { Fragment } from 'react'
import { run } from '../run/runState'
import type { StepRecord } from '../tensor'
import { formatKey } from '../format/numbers'
import { buildOperationRows, type NumberRow } from './operationRows'
import NumberHint from './NumberHint'
import { buildHintData } from './hintData'
import SubscriptText from './SubscriptText'

/**
 * Панель операции — дефолтный вид: формула + входы/выходы/градиенты операции,
 * ИСПОЛНЕННОЙ живым движком (числа — вывод движка, не предвычисленный JSON).
 * Показывает уровень «операция» иерархии DOCS-02; testid «step-panel» —
 * контракт e2e на содержимое экрана, не на имя компонента (правило R2), и
 * не переименовывается. До первого «Шага» — вводная панель предстоящей
 * операции (числа появятся после исполнения). Изменившееся (changed) —
 * gray-900 + accent-тинт #E69F00 @10%, неизменившееся — gray-500. Клик по
 * числу → openDrill, hover/focus → тултип tier 1 (NumberHint, R5).
 * Потолки чисел (≤7 ключевых / ≤30 на экране) — чистая модель operationRows.
 */

function NumberRowView({ row, joiner, record }: { row: NumberRow; joiner: string; record: StepRecord }) {
  const valueClass = row.kind === 'input' || !row.changed ? 'value-unchanged' : 'value-changed'
  return (
    <div className={`num flex flex-wrap items-baseline gap-x-2 ${row.changed ? 'text-neutral-900' : 'text-neutral-500'}`}>
      <span>
        <SubscriptText text={row.sym} /> =
      </span>
      {row.values.map((v, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden="true">{joiner}</span>}
          <NumberHint hint={buildHintData(record, `${row.sym}[${i}]`)}>
            <button
              type="button"
              className={`value-btn ${valueClass}`}
              data-ref={`${row.sym}[${i}]`}
              onClick={() => run.openDrill(`${row.sym}[${i}]`)}
            >
              {formatKey(v)}
            </button>
          </NumberHint>
        </Fragment>
      ))}
      {row.hidden > 0 && <span className="value-unchanged">+{row.hidden}</span>}
    </div>
  )
}

export default function OperationPanel({ record }: { record: StepRecord | null }) {
  // До первого шага: предстоящая операция — без чисел (они появятся после «Шага»)
  if (record === null) {
    return (
      <div
        data-testid="step-panel"
        className="flex h-full flex-col gap-4 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4"
      >
        <p data-testid="step-formula" className="num text-neutral-900">
          <SubscriptText text="z1 = W1·x" />
        </p>
        <p className="ui-text text-neutral-500">Нажмите «Шаг →» — движок исполнит первую операцию, и здесь появятся её числа.</p>
      </div>
    )
  }
  const rows = buildOperationRows(record)
  // update: массив значений — «до -> после»
  const joiner = record.phase === 'update' ? '->' : ','
  return (
    <div
      data-testid="step-panel"
      className="flex h-full flex-col gap-4 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <p data-testid="step-formula" className="num text-neutral-900">
        <SubscriptText text={record.formula} />
      </p>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <NumberRowView key={`${row.kind}:${row.sym}`} row={row} joiner={joiner} record={record} />
        ))}
      </div>
    </div>
  )
}

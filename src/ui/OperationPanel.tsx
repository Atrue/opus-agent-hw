import { Fragment } from 'react'
import { run } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import type { StepRecord } from '../tensor'
import { formatKey } from '../format/numbers'
import { buildOperationRows, type NumberRow } from './operationRows'
import NarrativeLine from './NarrativeLine'
import NumberHint from './NumberHint'
import { buildHintData } from './hintData'
import SubscriptText from './SubscriptText'

/**
 * Панель операции — дефолтный вид: формула + входы/выходы/градиенты операции,
 * ИСПОЛНЕННОЙ живым движком (числа — вывод движка, не предвычисленный JSON).
 * Показывает уровень «операция» иерархии DOCS-02; testid «step-panel» —
 * контракт e2e на содержимое экрана, не на имя компонента (правило R2), и
 * не переименовывается. До первого «Шага» — вводная панель предстоящей
 * операции (числа появятся после исполнения). Нарратив шага (Pitfall 12)
 * живёт в шапке карточки. Изменившееся (changed) — on-surface + tertiary-тинт
 * 10%, неизменившееся — вторичный текст. Клик по числу → openDrill,
 * hover/focus → тултип tier 1 (NumberHint, R5). Потолки чисел (≤7 ключевых /
 * ≤30 на экране) — чистая модель operationRows.
 */

// Нарратив до первого шага — предстоящей операции
const INTRO_NARRATIVE = XOR_SCENARIO.opMeta[0]!.narrative

function NumberRowView({ row, joiner, record }: { row: NumberRow; joiner: string; record: StepRecord }) {
  const valueClass = row.kind === 'input' || !row.changed ? 'value-unchanged' : 'value-changed'
  return (
    <div className={`num flex flex-wrap items-baseline gap-x-2 ${row.changed ? 'text-on-surface' : 'text-on-surface-variant'}`}>
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
      <div data-testid="step-panel" className="card h-full">
        <div className="card-head">
          <span className="icon" aria-hidden="true">
            functions
          </span>
          <h2 className="card-title">Панель операции</h2>
          <span className="card-meta ui-label">шаг 1/13</span>
        </div>
        <NarrativeLine text={INTRO_NARRATIVE} />
        <p data-testid="step-formula" className="num text-on-surface">
          <SubscriptText text="z1 = W1·x" />
        </p>
        <p className="ui-text text-on-surface-variant">Нажмите «Шаг»: движок исполнит первую операцию, и здесь появятся её числа.</p>
      </div>
    )
  }
  const rows = buildOperationRows(record)
  // update: массив значений — «до → после»
  const joiner = record.phase === 'update' ? '→' : ','
  return (
    <div data-testid="step-panel" className="card h-full overflow-auto">
      <div className="card-head">
        <span className="icon" aria-hidden="true">
          functions
        </span>
        <h2 className="card-title">Панель операции</h2>
        <span className="card-meta ui-label">шаг {record.index + 1}/13</span>
      </div>
      <NarrativeLine text={record.narrative.ru} />
      <p data-testid="step-formula" className="num text-on-surface">
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

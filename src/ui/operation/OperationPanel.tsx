import { Fragment } from 'react'
import { run } from '../../run/run'
import { activeScenario } from '../../run/scenario'
import type { StepRecord } from '../../tensor'
import { formatKey } from '../../format'
import { Card, CardAction, CardHeader, CardTitle } from '../kit'
import { buildOperationRows, type NumberRow } from './operationRows'
import { NarrativeLine } from '../typography/NarrativeLine'
import { NumberHint } from '../numbers/NumberHint'
import { buildHintData } from '../numbers/hint'
import { SubscriptText } from '../typography/SubscriptText'

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

// Вводная панель до первого шага — метаданные предстоящей операции спека
const INTRO = activeScenario().ops[0]!

function NumberRowView({ row, joiner, record }: { row: NumberRow; joiner: string; record: StepRecord }) {
  const valueClass = row.kind === 'input' || !row.changed ? 'value-unchanged' : 'value-changed'
  return (
    <div className={`num flex flex-wrap items-baseline gap-x-2 ${row.changed ? 'text-on-surface' : 'text-on-surface-variant'}`}>
      <span>
        <SubscriptText text={row.sym} /> =
      </span>
      {row.values.map((v, i) => (
        <Fragment key={`${row.sym}[${i}]`}>
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

export function OperationPanel({ record }: { record: StepRecord | null }) {
  // До первого шага: предстоящая операция — без чисел (они появятся после «Шага»)
  if (record === null) {
    return (
      <Card data-testid="step-panel" className="h-full">
        <CardHeader>
          <span className="icon" aria-hidden="true">
            functions
          </span>
          <CardTitle>Панель операции</CardTitle>
          <CardAction className="ui-label">шаг 1/{String(activeScenario().ops.length)}</CardAction>
        </CardHeader>
        <NarrativeLine text={INTRO.narrative} />
        <p data-testid="step-formula" className="num text-on-surface">
          <SubscriptText text={INTRO.formula} />
        </p>
        <p className="ui-text text-on-surface-variant">Нажмите «Шаг»: движок исполнит первую операцию, и здесь появятся её числа.</p>
      </Card>
    )
  }
  const rows = buildOperationRows(record)
  // update: массив значений — «до → после»
  const joiner = record.phase === 'update' ? '→' : ','
  return (
    <Card data-testid="step-panel" className="h-full overflow-auto">
      <CardHeader>
        <span className="icon" aria-hidden="true">
          functions
        </span>
        <CardTitle>Панель операции</CardTitle>
        <CardAction className="ui-label">
          шаг {String(record.index + 1)}/{String(activeScenario().ops.length)}
        </CardAction>
      </CardHeader>
      <NarrativeLine text={record.narrative.ru} />
      <p data-testid="step-formula" className="num text-on-surface">
        <SubscriptText text={record.formula} />
      </p>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <NumberRowView key={`${row.kind}:${row.sym}`} row={row} joiner={joiner} record={record} />
        ))}
      </div>
    </Card>
  )
}

import { useRunSlice } from '../run/runState'
import { buildWeightsTable } from '../run/history'
import { formatKey } from '../format/numbers'
import NumberHint from './NumberHint'
import type { HintData } from './hintData'
import SubscriptText from './SubscriptText'

/**
 * Таблица весов по эпохам (UX-06): строки — 13 весов W1[0,0]…b2[0]
 * (SubscriptText-рендер меток), столбцы — снапшоты эпох; эпоха 0 — стартовые
 * константы сценария. Значения formatKey, tabular-nums (класс num); колонка
 * добавляется в момент завершения эпохи. Горизонтальный скролл по эпохам;
 * последний столбец — accent-тинт изменившегося (существующий класс).
 * Подписка селектором снапшотов (стабильная ссылка, R4). Hover на ячейку —
 * тултип tier 1 (R5): значение эпохи + живое значение сейчас + градиент
 * ∂L/∂w текущей записи при наличии (ячейка — span без tabIndex: таблица
 * supplementary, полный a11y-путь — те же веса в панели/на диаграмме).
 */

/** Градиентная строка записи для плоского индекса снапшота (0..12). */
function gradRefOf(r: number): { sym: string; index: number } {
  if (r < 6) return { sym: '∂L/∂W1', index: r }
  if (r < 9) return { sym: '∂L/∂b1', index: r - 6 }
  if (r < 12) return { sym: '∂L/∂W2', index: r - 9 }
  return { sym: '∂L/∂b2', index: 0 }
}

function gradAt(values: number[] | number[][] | undefined, index: number): number | null {
  if (values === undefined) return null
  const flat = Array.isArray(values[0]) ? (values as number[][]).flat() : (values as number[])
  return flat[Math.min(index, flat.length - 1)] ?? null
}

export default function WeightsTable() {
  const snapshots = useRunSlice((r) => r.weightSnapshots)
  const record = useRunSlice((r) => r.currentRecord)
  const table = buildWeightsTable(snapshots)
  const last = table.epochs.length - 1
  const live = snapshots[last] ?? []

  return (
    <div
      data-testid="weights-table"
      className="screen screen-scroll min-h-0 flex-1 overflow-auto"
      role="group"
      aria-label="Таблица весов по эпохам"
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="ui-label whitespace-nowrap px-2 py-1 text-on-surface-variant">вес</th>
            {table.epochs.map((e) => (
              <th key={e} className="ui-label whitespace-nowrap px-2 py-1 text-right text-on-surface-variant">
                эпоха {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={row.label}>
              <th scope="row" className="num whitespace-nowrap px-2 py-0.5 font-normal text-on-surface">
                <SubscriptText text={row.label} />
              </th>
              {row.values.map((v, e) => {
                const g = gradRefOf(r)
                const hint: HintData = {
                  sym: row.label,
                  value: v,
                  formula: null,
                  gradient: gradAt(record?.grads?.[g.sym], g.index),
                  note: e === last ? null : `эпоха ${String(e)}, сейчас: ${formatKey(live[r] ?? v)}`,
                }
                return (
                  <td
                    key={e}
                    className={`num whitespace-nowrap px-2 py-0.5 text-right${e === last && last > 0 ? ' value-changed' : ' value-unchanged'}`}
                  >
                    <NumberHint hint={hint}>
                      <span>{formatKey(v)}</span>
                    </NumberHint>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useRunSlice } from '../run/runState'
import { buildWeightsTable } from '../run/history'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * Таблица весов по эпохам (UX-06): строки — 13 весов W1[0,0]…b2[0]
 * (SubscriptText-рендер меток), столбцы — снапшоты эпох; эпоха 0 — стартовые
 * константы сценария. Значения formatKey, tabular-nums (класс num); колонка
 * добавляется в момент завершения эпохи. Горизонтальный скролл по эпохам;
 * последний столбец — accent-тинт изменившегося (существующий класс).
 * Подписка селектором снапшотов (стабильная ссылка, R4).
 */
export default function WeightsTable() {
  const snapshots = useRunSlice((r) => r.weightSnapshots)
  const table = buildWeightsTable(snapshots)
  const last = table.epochs.length - 1

  return (
    <div data-testid="weights-table" className="h-full overflow-x-auto" role="group" aria-label="Таблица весов по эпохам">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="ui-label whitespace-nowrap px-2 py-1 text-neutral-500">вес</th>
            {table.epochs.map((e) => (
              <th key={e} className="ui-label whitespace-nowrap px-2 py-1 text-right text-neutral-500">
                эпоха {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="num whitespace-nowrap px-2 py-0.5 font-normal text-neutral-900">
                <SubscriptText text={row.label} />
              </th>
              {row.values.map((v, e) => (
                <td
                  key={e}
                  className={`num whitespace-nowrap px-2 py-0.5 text-right${e === last && last > 0 ? ' value-changed' : ' value-unchanged'}`}
                >
                  {formatKey(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

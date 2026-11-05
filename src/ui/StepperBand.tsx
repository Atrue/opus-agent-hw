import { useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * Лента шагов (DESIGN.md §4/§9) — навигационный хребет: 13 пилюль операций
 * текущего сэмпла с mono-значениями. Состояния: done (opacity-80, значение
 * заполнено) / active (container-high + ring-1 primary + оверлей primary/10
 * pulse 2s) / future (opacity-60). 2→4→8 колонок по брейкпоинтам.
 *
 * Индикатор, НЕ навигация: прогон forward-only (AGENTS.md/D-21) — клика назад
 * нет; конфликт с DESIGN.md §7 («каждый шаг кликабелен для возврата»)
 * зафиксирован в D-25. Точка пилюли — фазный цвет (четвёртый канал фазы
 * рядом с бейджем и окраской потока). Значения — sampleOpValues прогона
 * (заполняются и после fast-forward — те же числа, что пошагово).
 */

const PHASE_COLOR_VAR = {
  forward: '--color-phase-fwd',
  loss: '--color-phase-loss',
  backward: '--color-phase-bwd',
  update: '--color-phase-upd',
} as const

/** Короткий лейбл пилюли — левая часть формулы операции (z1, ŷ, ∂L/∂W1, W). */
function pillLabel(formula: string): string {
  return formula.split('=')[0]!.trim()
}

export default function StepperBand() {
  const stepInSample = useRunSlice((r) => r.stepInSample)
  const screen = useRunSlice((r) => r.screen)
  const values = useRunSlice((r) => r.sampleOpValues)
  const epochDone = screen === 'epoch-end'

  return (
    <div
      data-testid="step-band"
      role="list"
      aria-label={`Лента шагов сэмпла: ${String(stepInSample)} из 13`}
      className="step-band grid-cols-2 md:grid-cols-4 xl:grid-cols-8"
    >
      {XOR_SCENARIO.opMeta.map((meta, i) => {
        const step = i + 1
        const done = epochDone || step < stepInSample
        const active = !epochDone && step === stepInSample
        const state = done ? 'done' : active ? 'active' : 'future'
        const value = values[i]
        return (
          <div key={step} role="listitem" className={`step-pill step-pill-${state}`} aria-current={active ? 'step' : undefined}>
            <span className="step-pill-dot" style={{ background: `var(${PHASE_COLOR_VAR[meta.phase]})` }} />
            <span className="step-pill-label">
              <SubscriptText text={pillLabel(meta.formula)} />
            </span>
            <span className="step-pill-value">{done && value !== undefined ? formatKey(value) : '·'}</span>
          </div>
        )
      })}
    </div>
  )
}

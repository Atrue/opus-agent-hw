import { useEffect, useRef } from 'react'
import { useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * Лента шагов (DESIGN.md §4/§9; 01.2-01 пункт 5 ТЗ) — ОДНА горизонтальная
 * строка над сценой: 13 пилюль операций текущего сэмпла с mono-значениями,
 * состояния done (opacity-80) / active (container-high + ring-1 primary +
 * оверлей primary/10 pulse 2s) / future (opacity-60). При смене шага active
 * пилюля скроллится в центр (scrollIntoView inline:center; reduced-motion →
 * behavior auto). Пилюли не переносятся — высота полосы фиксирована
 * (.step-band в index.css: grid-auto-flow column, overflow-x auto).
 *
 * Индикатор, НЕ навигация: прогон forward-only (AGENTS.md/D-21) — клика назад
 * нет; конфликт с DESIGN.md §7 зафиксирован в D-25. Точка пилюли — фазный
 * цвет (четвёртый канал фазы рядом с бейджем и окраской потока). Значения —
 * sampleOpValues прогона (заполняются и после fast-forward — те же числа).
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
  const bandRef = useRef<HTMLDivElement>(null)
  const epochDone = screen === 'epoch-end'

  // автоскролл к активной пилюле (центр полосы); reduced-motion → auto
  useEffect(() => {
    const band = bandRef.current
    if (band === null) return
    const active = band.querySelector('[aria-current="step"]')
    if (active === null) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [stepInSample])

  return (
    <div ref={bandRef} data-testid="step-band" role="list" aria-label={`Лента шагов сэмпла: ${String(stepInSample)} из 13`} className="step-band">
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
            <span className="step-pill-value">{done && value !== undefined ? formatKey(value) : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

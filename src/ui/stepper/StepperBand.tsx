import { useEffect, useLayoutEffect, useRef } from 'react'
import { useRunSlice } from '../../run/useRunSlice'
import { activeScenario } from '../../run/scenario'
import { formatKey } from '../../format'
import { SubscriptText } from '../typography/SubscriptText'

/**
 * Лента шагов (DESIGN.md §4/§9; 01.2-01 пункт 5 ТЗ) — ОДНА горизонтальная
 * строка над сценой: пилюли операций текущего сэмпла (по spec.ops) с
 * mono-значениями, состояния done (opacity-80) / active (container-high + ring-1 primary +
 * оверлей primary/10 pulse 2s) / future (opacity-60). При смене шага active
 * пилюля скроллится в центр (scrollIntoView inline:center; reduced-motion →
 * behavior auto). Пилюли не переносятся — высота полосы фиксирована
 * (.step-band в index.css: grid-auto-flow column, overflow-x auto).
 *
 * Точка 1 D-47 (фаза 3, движок D-50): акцент активной пилюли «переезжает» —
 * travel-гало .step-halo (единственный оверлей, pointer-events: none):
 * позиция/ширина = offsetLeft/offsetWidth активной пилюли (та же bandRef-
 * механика, что автоскролл; функция структуры — не времени), плавность —
 * CSS-transition 250 мс (ретаргет = interrupt-restart при спаме «Шаг»);
 * reduced-motion гасит глобальный гейт (мгновенная установка). Пульс
 * активной пилюли (2 s loop) — континуальный индикатор, не трогается.
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

export function StepperBand() {
  const stepInSample = useRunSlice((r) => r.stepInSample)
  const screen = useRunSlice((r) => r.screen)
  const values = useRunSlice((r) => r.sampleOpValues)
  const bandRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const epochDone = screen === 'epoch-end'

  // автоскролл к активной пилюле (центр полосы); reduced-motion → auto
  useEffect(() => {
    const band = bandRef.current
    if (band === null || epochDone) return
    const active = band.querySelectorAll('.step-pill')[stepInSample - 1]
    if (active === undefined) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [stepInSample, epochDone])

  // travel-гало (точка 1 D-47): цель = геометрия активной пилюли; useLayoutEffect
  // ставит позицию до отрисовки (первый кадр — без анимации), далее CSS-
  // transition перевозит (retarget при rapid-interact); на экране эпохи
  // активной пилюли нет — гало скрыто
  useLayoutEffect(() => {
    const halo = haloRef.current
    const band = bandRef.current
    if (halo === null || band === null) return
    const active = epochDone ? undefined : band.querySelectorAll('.step-pill')[stepInSample - 1]
    if (active === undefined || !(active instanceof HTMLElement)) {
      halo.style.opacity = '0'
      return
    }
    halo.style.opacity = '1'
    halo.style.width = `${String(active.offsetWidth)}px`
    halo.style.transform = `translateX(${String(active.offsetLeft)}px)`
  }, [stepInSample, epochDone])

  return (
    <div
      ref={bandRef}
      data-testid="step-band"
      role="list"
      aria-label={`Лента шагов сэмпла: ${String(stepInSample)} из ${String(activeScenario().ops.length)}`}
      className="step-band"
    >
      <div ref={haloRef} className="step-halo" aria-hidden="true" />
      {activeScenario().ops.map((meta, i) => {
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

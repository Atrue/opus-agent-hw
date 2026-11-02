/**
 * Плеер walkthrough: состояние = f(trace, stepIndex), UI — чистый рендер над ним
 * (ARCHITECTURE.md Pattern 1). Хранилище — только встроенные средства React:
 * модульный стор + useSyncExternalStore. Внешние store-библиотеки исключены
 * решением пользователя (checkpoint 01-01, 2026-11-02); любая store-библиотека
 * добавляется только после явного вопроса пользователю с обоснованием.
 */
import { useSyncExternalStore } from 'react'
import traceJson from '../data/xor-trace.json'
import { validateTrace, type MockTrace, type TraceStep } from './types'

export const trace: MockTrace = validateTrace(traceJson)

export type Mode = 'default' | 'lecture'

export interface Drill {
  kind: 'number'
  stepIndex: number
  ref: string
}

export interface PlayerState {
  stepIndex: number
  drill: Drill | null
  mode: Mode
}

export type PlayerAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'jumpTo'; index: number }
  | { type: 'openDrill'; ref: string }
  | { type: 'closeDrill' }
  | { type: 'toggleMode' }

/** Кламп индекса шага в границы 0..last (для 14 шагов — 0..13). */
export function clampIndex(index: number, last: number): number {
  return Math.min(Math.max(Math.trunc(index) || 0, 0), last)
}

/** Чистая переходная функция плеера — кламп 0..13, drill сбрасывается при смене шага. */
export function transition(state: PlayerState, action: PlayerAction): PlayerState {
  const last = trace.steps.length - 1
  switch (action.type) {
    case 'next':
      return { ...state, stepIndex: clampIndex(state.stepIndex + 1, last), drill: null }
    case 'prev':
      return { ...state, stepIndex: clampIndex(state.stepIndex - 1, last), drill: null }
    case 'jumpTo':
      return { ...state, stepIndex: clampIndex(action.index, last), drill: null }
    case 'openDrill':
      return { ...state, drill: { kind: 'number', stepIndex: state.stepIndex, ref: action.ref } }
    case 'closeDrill':
      return { ...state, drill: null }
    case 'toggleMode':
      return { ...state, mode: state.mode === 'default' ? 'lecture' : 'default' }
  }
}

let state: PlayerState = { stepIndex: 0, drill: null, mode: 'default' }
const listeners = new Set<() => void>()

function setState(next: PlayerState): void {
  state = next
  for (const listener of listeners) listener()
}

/** Императивный API плеера (те же действия, что у кнопок/клавиатуры). */
export const player = {
  getState: (): PlayerState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  next(): void {
    setState(transition(state, { type: 'next' }))
  },
  prev(): void {
    setState(transition(state, { type: 'prev' }))
  },
  jumpTo(index: number): void {
    setState(transition(state, { type: 'jumpTo', index }))
  },
  openDrill(ref: string): void {
    setState(transition(state, { type: 'openDrill', ref }))
  },
  closeDrill(): void {
    setState(transition(state, { type: 'closeDrill' }))
  },
  toggleMode(): void {
    setState(transition(state, { type: 'toggleMode' }))
  },
}

/** React-хук плеера на встроенном useSyncExternalStore. */
export function usePlayer(): PlayerState {
  return useSyncExternalStore(player.subscribe, player.getState)
}

// Селекторы: производные значения не хранятся в сторе.

export const selectStep = (s: PlayerState): TraceStep => trace.steps[s.stepIndex] as TraceStep

export const selectPosition = (s: PlayerState): string => `Шаг ${s.stepIndex + 1} из ${trace.steps.length}`

export const selectIsFirst = (s: PlayerState): boolean => s.stepIndex === 0

export const selectIsLast = (s: PlayerState): boolean => s.stepIndex === trace.steps.length - 1
